'use strict';

const express = require('express');
const utils = require('./utils');
const config = require('../config');

const router = new express.Router();

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
      url: `${config.services.virtualcurrency}/products`,
      json: payloadToPipe(req.body)
    }, res);
  };
};

// List items.
router.get('/items', pipeTo({
  method: 'get',
  url: `${config.services.virtualcurrency}/auth/token/products`
}));

// Create or updated item.
router.post('/items/:id', pipeToProducts('post'));
router.put('/items/:id', pipeToProducts('put'));

module.exports = router;
