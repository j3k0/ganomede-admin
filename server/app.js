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
const apiBase = config.http.apiBase;


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

// redirect from index routes to web-interface.
const redirectToWebUi = (req, res) => res.redirect(`${apiBase}/web`);
app.get('/', redirectToWebUi);
app.get(apiBase, redirectToWebUi);

// these are public
app.use('/about', require('./about.router'));
app.use(`${apiBase}/about`, require('./about.router'));
app.use('/ping', require('./ping.router'));
app.use(`${apiBase}/ping`, require('./ping.router'));
app.use(`${apiBase}/web`, require('./static.router'));

// these need auth
app.use(`${apiBase}/api`, auth.router);
app.use(auth.mwValidate);
app.use(`${apiBase}/api/items`, require('./vcurrency').itemsRouter);
app.use(`${apiBase}/api/packs`, require('./vcurrency').packsRouter);
app.use(`${apiBase}/api/islogged`, function (req, res) {
  res.json({success: true});
});

module.exports = app;
