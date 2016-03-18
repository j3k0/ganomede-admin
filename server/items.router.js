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

router.get('/items', pipeTo({
  method: 'get',
  url: `${config.services.virtualcurrency}/auth/token/products`
}));

router.put('/item/:id', (req, res) => {
  utils.safeRequestPipe({
    method: 'put',
    url: `${config.services.virtualcurrency}/products`,
    json: req.body
  }, res);
});

module.exports = router;
