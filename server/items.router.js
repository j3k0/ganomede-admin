'use strict';

const url = require('url');
const express = require('express');
const utils = require('./utils');
const config = require('../config');

const router = new express.Router();
const upstreamUrl = url.format({
  protocol: 'http',
  hostname: config.services.virtualcurrency.host,
  port: config.services.virtualcurrency.port,
  pathname: '/virtualcurrency/v1'
});

const pipeTo = (options) => {
  return (req, res) => {
    utils.safeRequestPipe[options.method](options.url, res);
  };
};

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

// List currencies.
router.get('/items/_currencies', (req, res) => {
  res.json(config.services.virtualcurrency.currencies);
});

// List items.
router.get('/items', pipeTo({
  method: 'get',
  url: `${upstreamUrl}/auth/token/products`
}));

// Create or updated item.
router.post('/items/:id', pipeToProducts('post'));
router.put('/items/:id', pipeToProducts('put'));

module.exports = router;
