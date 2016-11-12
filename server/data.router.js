'use strict';

const express = require('express');
const upstreams = require('./upstreams');

const router = express.Router();

const proxy = (method) => {
  return (req, res) => {
    const opts = {
      method,
      url: req.path,
    };

    if (method !== 'get')
      opts.body = Object.assign({secret: process.env.API_SECRET}, req.body || {});
    else
      opts.qs = req.query;

    upstreams.data.request(opts, (err, body) => {
      return err
        ? res.status(500).json(err)
        : res.json(body);
    });
  };
};

[ 'get /docs',
  'post /docs',
  'get /docs/:id',
  'post /docs/:id',
  'delete /docs/:id'
].forEach(spec => {
  const [method, endpoint] = spec.split(' ');
  const handler = proxy(method);
  router[method](endpoint, handler);
});

module.exports = router;
