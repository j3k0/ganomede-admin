'use strict';

const express = require('express');
const path = require('path');

const router = new express.Router();
const assetsDir = path.resolve(`${__dirname}/../web/`);
const indexHtml = path.resolve(assetsDir, 'index.html');

// Since we use react-router with browser history,
// we need to serve our app (index.html) for every route.
//   - first check for css/js/etc.
//   - respond with index.html.
router.use('/', express.static(assetsDir));
router.use((req, res) => res.sendFile(indexHtml));

module.exports = router;
