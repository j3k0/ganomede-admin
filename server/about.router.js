'use strict';

const os = require('os');
const express = require('express');
const pkg = require('../package.json');

const router = new express.Router();

//
// About endpoint
//

const aboutData = {
  type: pkg.name,
  version: pkg.version,
  description: pkg.description,
  hostname: os.hostname(),
  startDate: new Date().toISOString()
};

const about = function(req, res) {
  res.send(aboutData);
};

router.get('/', about);

module.exports = router;
