'use strict';

const pkg = require('./package.json');

const config = {
  /* couch: {
    host: process.env.COUCHDB_HOST || 'localhost',
    port: +process.env.COUCHDB_PORT || 5984,
    user: process.env.COUCHDB_USER || '',
    password: process.env.COUCHDB_PASSWORD || '',
    db: process.env.COUCHDB_DB || 'blog'
  }, */

  http: {
    host: process.env.HOST || '0.0.0.0',
    port: +process.env.PORT || 8000,
    apiBase: `/${pkg.api}`
  },

  auth: {
    admin: {
      username: process.env.ADMIN_USERNAME || '1',
      password: process.env.ADMIN_PASSWORD || '1',
      token: process.env.ADMIN_TOKEN || null
    }
  },

  services: {
    virtualcurrency: {
      host: process.env.VIRTUAL_CURRENCY_PORT_8080_TCP_ADDR || 'localhost',
      port: +process.env.VIRTUAL_CURRENCY_PORT_8080_TCP_PORT || 8080,
      currencies: (function () {
        const envName = 'VIRTUAL_CURRENCY_CURRENCY_CODES';
        const has = process.env.hasOwnProperty(envName);
        const currencies = String(process.env[envName]).split(',');

        if (has && currencies.length > 1)
          return currencies;

        throw new Error(`Please provide currency codes via ${envName} env variable.`);
      }())
    }
  }
};

module.exports = config;

if (!module.parent)
  console.log(module.exports); // eslint-disable-line no-console
