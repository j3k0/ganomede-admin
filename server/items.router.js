'use strict';

const express = require('express');
const utils = require('./utils');
const config = require('../config');

const router = new express.Router();
const upstream = new utils.Upstream({
  protocol: 'http',
  hostname: config.services.virtualcurrency.host,
  port: config.services.virtualcurrency.port,
  pathname: '/virtualcurrency/v1'
});

// Build a body to pass upstream to vcurrency server:
//   - add `secret`, if not pressent.
const payloadToPipe = (expressBody) => {
  const payload = utils.clonePlainObject(expressBody);
  payload.secret = payload.secret || process.env.API_SECRET;
  return payload;
};

const pipeToProducts = (method) => {
  return (req, res) => {
    upstream.request({
      method,
      url: '/products',
      body: payloadToPipe(req.body)
    }, (err, body) => {
      if (err)
        return res.status(500).json(err);

      res.json(body);
    });
  };
};

// List items.
router.get('/items', (req, res) => {
  const options = {
    method: 'get',
    url: `/auth/${process.env.API_SECRET}/products`,
    qs: {limit: 500}
  };

  upstream.request(options, (err, items) => {
    if (err)
      return res.status(500).json(err);

    res.json({
      items,
      currencies: config.services.virtualcurrency.currencies
    });
  });
});

// Create or updated item.
router.post('/items/:id', pipeToProducts('post'));
router.put('/items/:id', pipeToProducts('put'));

module.exports = router;
