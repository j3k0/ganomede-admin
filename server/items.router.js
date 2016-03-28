'use strict';

const url = require('url');
const express = require('express');
const request = require('request');
const utils = require('./utils');
const config = require('../config');

const router = new express.Router();
const upstreamUrl = url.format({
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
    utils.safeRequestPipe({
      method,
      url: `${upstreamUrl}/products`,
      json: payloadToPipe(req.body)
    }, res);
  };
};

// List items.
router.get('/items', (req, res, next) => {
  const options = {
    method: 'get',
    url: `${upstreamUrl}/auth/token/products`,
    json: true
  };

  request(options, (err, response, items) => {
    if (err)
      return next(err);

    // TODO
    // if (response.statusCode !== 200)

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
