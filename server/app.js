'use strict';

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const passport = require('passport');
const config = require('../config');
const auth = require('./auth');

const app = express();
const webRoot = `${config.http.baseUrl}/web`;
const apiRoot = `${config.http.baseUrl}/api`;


//
// Middlewares.
//

app.use(favicon(path.resolve(__dirname, '../web/images/favicon.ico')));
app.use(bodyParser.json()); // support json encoded bodies
app.use(cookieParser());
app.use(passport.initialize());

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
app.use(`${apiRoot}/islogged`, function (req, res) {
  res.json({success: true});
});

// Handle some known errors.
app.use(function (err, req, res, next) {
  if (err instanceof Error && err.name === 'UpstreamError')
    return res.status(500).json(err);

  // Not sure what to do, use default Express handler.
  next(err);
});

module.exports = app;
