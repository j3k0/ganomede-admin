'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const passport = require('passport');
const config = require('../config');
const auth = require('./auth');
const log = require('./log');

const app = express();
const webRoot = `${config.http.baseUrl}/web`;
const apiRoot = `${config.http.baseUrl}/api`;

const mailer = require('./mailer');
const mailTransport = mailer.createTransport();

//
// Middlewares.
//

app.use(favicon(path.resolve(__dirname, '../web/images/favicon.ico')));
app.use(bodyParser.json()); // support json encoded bodies
app.use(cookieParser());
app.use(passport.initialize());

const logger = function(req, res, next) {
  log(req.method + ' ' + req.originalUrl);
  next();
};
app.use(logger);

//
// Routers.
//

// Redirect from `/` and `/admin/v1` routes to web-interface.
const redirectToWebUi = (req, res) => res.redirect(webRoot);
app.get('/', redirectToWebUi);
app.get(config.http.baseUrl, redirectToWebUi);

// Ping and About.
app.use('/about', require('./about.router'));
app.use('/ping', require('./ping.router'));
app.use(`${config.http.baseUrl}/about`, require('./about.router'));
app.use(`${config.http.baseUrl}/ping`, require('./ping.router'));

// Serve static files.
app.use(webRoot, require('./static.router'));

// Any .use() after this line will be going through auth validation first.
// auth.router also includes `/login` and `/logout` handlers.
app.use(`${apiRoot}`, auth.router, auth.mwValidate);

// API routes.
app.use(`${apiRoot}/items`, require('./vcurrency').itemsRouter);
app.use(`${apiRoot}/packs`, require('./vcurrency').packsRouter);
app.use(`${apiRoot}/users`, require('./users'));
app.use(`${apiRoot}/data`, require('./data.router'));
app.use(`${apiRoot}/islogged`, function (req, res) {
  res.json({success: true});
});

const mailRouter = new express.Router();
mailRouter.post(`${apiRoot}/send-email`, async (req, res, next) => {
  try {
    log.info({body: req.body}, 'send-email');
    mailTransport.sendMail(req.body, (err, info) => {
      if (err)
        return next(err);
      res.status(200).json(info);
    });
  }
  catch (ex) {
    next(ex);
  }
});
app.use(mailRouter);

// Handle some known errors.
app.use(function (err, req, res, next) {
  if (err instanceof Error && err.name === 'UpstreamError')
    return res.status(500).json(err);

  // Not sure what to do, use default Express handler.
  next(err);
});

module.exports = app;
