'use strict';

const express = require('express');

const router = new express.Router();

const services = ['SERVERS', 'ANALYTICS'].reduce((prev, key) => {
  const arr = [];
  let i = 1;

  for (;;) {
    const name = process.env[`${key}_LINK${i}_NAME`];
    const url = process.env[`${key}_LINK${i}_URL`];

    if (name && url) {
      arr.push({name, url});
      i += 1;
    }
    else {
      break;
    }
  }

  prev[key] = arr;
  return prev;
}, {});

router.get('/links/:key', function (req, res) {
  const key = String(req.params.key).toUpperCase();
  res.json(services[key] || []);
});

module.exports = router;
