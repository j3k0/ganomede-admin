'use strict';

const fs = require('fs');
const express = require('express');
const path = require('path');
const upstreams = require('./upstreams');

const router = new express.Router();
const assetsDir = path.resolve(`${__dirname}/../web/`);
const indexHtml = (function () {
  const services = Object.keys(upstreams);
  const initialState = JSON.stringify({services});
  const template = fs.readFileSync(path.resolve(assetsDir, 'index.html'), 'utf8');

  return template.replace('{{REACT_INITIAL_STATE}}', initialState);
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
