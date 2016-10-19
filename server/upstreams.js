'use strict';

// Exports some commonly used upstream objects,
// so we don't have to reconfig them in every place.

const utils = require('./utils');
const config = require('../config');

const createUpstream = (name) => new utils.Upstream({
  protocol: config.services[name].protocol,
  hostname: config.services[name].host,
  port: config.services[name].port,
  pathname: `/${name}/v1`
});

module.exports = {
  virtualcurrency: createUpstream('virtualcurrency'),
  users: createUpstream('users'),
  avatars: createUpstream('avatars'),
  data: createUpstream('data')
};
