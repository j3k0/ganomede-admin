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
  })
};
