'use strict';

const pkg = require('./package.json');

const hasService = (service, port=8080) => {
  return process.env.hasOwnProperty(`${service}_PORT_${port}_TCP_ADDR`) || null;
};

const parseServiceAddress = (service, port=8080) => {
  return {
    protocol: process.env[service + `_PORT_${port}_TCP_PROTOCOL`] || 'http',
    host: process.env[service + `_PORT_${port}_TCP_ADDR`] || 'localhost',
    port: parseInt(process.env[service + `_PORT_${port}_TCP_PORT`], 10) || 8080
  };
};

const optionalService = (name, port=8080) => hasService(name, port) && parseServiceAddress(name, port);

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

  // This whole object will be going to frontend
  branding: {
    title: process.env.BRANDING_TITLE || 'Ganomede'
  },

  // Keys from this object will be going to frontend.
  services: {
    virtualcurrency: hasService('VIRTUAL_CURRENCY')
      ? Object.assign(
        parseServiceAddress('VIRTUAL_CURRENCY'),
        (function () {
          const envName = 'VIRTUAL_CURRENCY_CURRENCY_CODES';
          const has = process.env.hasOwnProperty(envName);
          const currencies = String(process.env[envName]).split(',');

          if (has && currencies.length > 1)
            return {currencies};

          throw new Error(`Please provide currency codes via ${envName} env variable.`);
        }())
      )
      : null,

    avatars: optionalService('AVATARS'),
    users: optionalService('USERS'),
    usermeta: optionalService('USERMETA'),
    data: optionalService('DATA'),
    directory: optionalService('DIRECTORY', 8000),
    chat: optionalService('CHAT')
  }
};

module.exports = config;

if (!module.parent)
  console.log(require('util').inspect(module.exports, {depth: null})); // eslint-disable-line no-console
