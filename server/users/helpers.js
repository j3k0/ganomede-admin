'use strict';

const upstreams = require('../upstreams');
const config = require('../../config');

// TODO
// this does not exist yet in vcurrency
// (https://github.com/j3k0/ganomede-virtualcurrency/pull/23)
const balance = function (username, callback) {
  upstreams.virtualcurrency.request({
    url: `${balance.url}/${username}`
  }, callback);
};

balance.url = `/auth/${process.env.API_SECRET}/coins/${config.services.virtualcurrency.currencies.join(',')}/count`;

module.exports = {
  balance
};
