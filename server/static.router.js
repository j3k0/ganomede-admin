'use strict';

const fs = require('fs');
const express = require('express');
const path = require('path');
const upstreams = require('./upstreams');
const config = require('../config');

const router = new express.Router();
const assetsDir = path.resolve(`${__dirname}/../web/`);
const indexHtml = (function () {
  const initialState = JSON.stringify({
    // Send service names to frontend (but account for optionals).
    services: Object.keys(upstreams).filter(key => !!upstreams[key]),
    // Branding configuration.
    branding: config.branding
  });

  const template = fs.readFileSync(path.resolve(assetsDir, 'index.html'), 'utf8');

  return template
    .replace('{{REACT_INITIAL_STATE}}', initialState)
    .replace('{{BRANDING_TITLE}}', `${config.branding.title} Administration`);
}());

const sendIndexHtml = (req, res) => res.send(indexHtml);

// Since we use react-router with browser history,
// we need to serve our app (index.html) for every route.
//   - first check for css/js/etc.
//   - respond with index.html.
router.get('/', sendIndexHtml);
router.use('/', express.static(assetsDir));
router.use(sendIndexHtml);
module.exports = router;
