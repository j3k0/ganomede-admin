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

router.use('/packs', proxy({
  get: `/auth/${process.env.API_SECRET}/packs`,
  post: `/auth/${process.env.API_SECRET}/packs`,
  put: `/auth/${process.env.API_SECRET}/packs`
}));

module.exports = router;
