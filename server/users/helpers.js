'use strict';

const async = require('async');
const upstreams = require('../upstreams');
const config = require('../../config');

const authUrl = (username, path) => {
  const token = `${process.env.API_SECRET}.${username}`;
  return `/auth/${token}${path}`;
};

const balance = function (username, callback) {
  const path = `/coins/${config.services.virtualcurrency.currencies.join(',')}/count`;

  upstreams.virtualcurrency.request({
    url: authUrl(username, path)
  }, callback);
};

const transactions = function (username, callback) {
  upstreams.virtualcurrency.request({
    url: authUrl(username, '/transactions'),
    qs: {reasons: 'reward,purchase'}
  }, callback);
};

// callback(error, dataURI)
const avatar = function (username, callback) {
  upstreams.avatars.request({
    url: `/${username}/256.png`,
    encoding: null // request buffer
  }, (err, buf) => {
    if (err)
      return callback(err);

    callback(null, 'data:image/png;base64,' + buf.toString('base64'));
  });
};

const metadata = function (username, callback) {
  upstreams.users.request({
    url: `/${username}/metadata/location`
  }, (err, json) => {
    if (err)
      return callback(err);

    callback(null, {location: json.value});
  });
};

module.exports = {
  balance,
  transactions,
  avatar,
  metadata,

  profile: (username, callback) => {
    const bind = fn => fn.bind(null, username);

    async.parallel({
      balance: bind(balance),
      transactions: bind(transactions),
      avatar: bind(avatar),
      metadata: bind(metadata)
    }, callback);
  }
};
