'use strict';

// Exports some commonly used upstream objects,
// so we don't have to reconfig them in every place.

const utils = require('./utils');
const config = require('../config');

module.exports = {
  virtualcurrency: new utils.Upstream({
    protocol: config.services.virtualcurrency.protocol,
    hostname: config.services.virtualcurrency.host,
    port: config.services.virtualcurrency.port,
    pathname: '/virtualcurrency/v1'
  }),

  users: new utils.Upstream({
    protocol: config.services.users.protocol,
    hostname: config.services.users.host,
    port: config.services.users.port,
    pathname: '/users/v1'
  }),

  avatars: new utils.Upstream({
    protocol: config.services.avatars.protocol,
    hostname: config.services.avatars.host,
    port: config.services.avatars.port,
    pathname: '/avatars/v1'
  })
};
