'use strict';

const pkg = require('./package.json');

const parseServiceAddress = (service) => {
  const present = process.env.hasOwnProperty(service + '_PORT_8080_TCP_ADDR');

  return present
    ? { protocol: process.env[service + '_PORT_8080_TCP_PROTOCOL'] || 'http',
        host: process.env[service + '_PORT_8080_TCP_ADDR'] || 'localhost',
        port: parseInt(process.env[service + '_PORT_8080_TCP_PORT'], 10) || 8080
      }
    : null;
};

const config = {
  pkg,

  http: {
    host: process.env.HOST || '0.0.0.0',
    port: +process.env.PORT || 8000,
    baseUrl: `/${pkg.api}`
  },

  auth: {
    admin: {
      username: process.env.ADMIN_USERNAME || '1',
      password: process.env.ADMIN_PASSWORD || '1'
    }
  },

  services: {
    virtualcurrency: Object.assign(
      parseServiceAddress('VIRTUAL_CURRENCY'),
      (function () {
        const envName = 'VIRTUAL_CURRENCY_CURRENCY_CODES';
        const has = process.env.hasOwnProperty(envName);
        const currencies = String(process.env[envName]).split(',');

        if (has && currencies.length > 1)
          return {currencies};

        throw new Error(`Please provide currency codes via ${envName} env variable.`);
      }())
    ),

    avatars: parseServiceAddress('AVATARS'),
    users: parseServiceAddress('USERS'),
    data: parseServiceAddress('DATA')
  }
};

module.exports = config;

if (!module.parent)
  console.log(require('util').inspect(module.exports, {depth: null})); // eslint-disable-line no-console
