'use strict';

const async = require('async');
const upstreams = require('../upstreams');
const config = require('../../config');

const authUrl = (username, path) => {
  const token = encodeURIComponent(`${process.env.API_SECRET}.${username}`);
  return `/auth/${token}${path}`;
};

const balance = function (username, callback) {
  const currencies = encodeURIComponent(config.services.virtualcurrency.currencies.join(','));

  upstreams.virtualcurrency.request({
    url: authUrl(username, `/coins/${currencies}/count`)
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
    url: `/${username}/64.png`,
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

const reward = function (username, amount, currency, callback) {
  upstreams.virtualcurrency.request({
    method: 'post',
    url: `/rewards`,
    body: {
      secret: process.env.API_SECRET,
      from: config.pkg.api,
      to: username,
      amount,
      currency
    }
  }, callback);
};

module.exports = {
  balance,
  transactions,
  avatar,
  metadata,
  reward,

  profile: (username, callback) => {
    const bind = fn => fn.bind(null, username);
    const ignoreError = fn => (cb) => fn((err, data) => cb(null, data));

    async.parallel({
      balance: bind(balance),
      transactions: bind(transactions),
      avatar: ignoreError(bind(avatar)),
      metadata: ignoreError(bind(metadata))
    }, (err, profile) => {
      if (err)
        return callback(err);

      const formatted = Object.assign(
        {username},
        profile,
        {balance: profile.balance.reduce((prev, currencyCount) => {
          prev[currencyCount.currency] = currencyCount.count;
          return prev;
        }, {})}
      );

      callback(null, formatted);
    });
  }
};
