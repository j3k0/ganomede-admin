'use strict';

const proxy = require('./single-list-proxy');
const config = require('../../config');

const itemsRouter = proxy(
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
);

const packsRouter = proxy({
  get: `/auth/${process.env.API_SECRET}/packs`,
  post: `/auth/${process.env.API_SECRET}/packs`,
  put: `/auth/${process.env.API_SECRET}/packs`
});

module.exports = {itemsRouter, packsRouter};
