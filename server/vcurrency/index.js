'use strict';

const express = require('express');
const proxy = require('./single-list-proxy');
const config = require('../../config');

const router = new express.Router();

router.use(
  '/items',
  proxy(
    { get: `/auth/${process.env.API_SECRET}/products`,
      post: '/products',
      put: '/products'
    },
    (json) => {
      return {
        items: json,
        currencies: config.services.virtualcurrency.currencies
      };
    }
  )
);

router.use('/packs', proxy('/packs'));

module.exports = router;
