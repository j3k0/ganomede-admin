'use strict';

const express = require('express');
const proxy = require('./single-list-proxy');
const config = require('../../config');

const router = new express.Router();

router.use('/items', proxy('/products', (json) => {
  return {
    items: json,
    currencies: config.services.virtualcurrency.currencies
  };
}));

module.exports = router;
