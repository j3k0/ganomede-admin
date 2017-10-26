'use strict';

const async = require('async');
const {awaitable} = require('awaitability');
const upstreams = require('../upstreams');
const config = require('../../config');

const apiSecret = process.env.API_SECRET;

const authUrl = (username, path) => {
  const token = encodeURIComponent(`${apiSecret}.${username}`);
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
      secret: apiSecret,
      from: config.pkg.api,
      to: username,
      amount,
      currency
    }
  }, callback);
};

const banInfo = function (username, callback) {
  upstreams.users.request({
    method: 'get',
    url: `/banned-users/${username}`
  }, callback);
};

// ban user
const banSetTrue = function (username, callback) {
  const method = 'post';
  const url    = '/banned-users';
  const body   = { apiSecret, username };
  upstreams.users.request({ method, url, body }, callback);
};

// unban user
const banSetFalse = function (username, callback) {
  const method = 'delete';
  const url = `/banned-users/${username}`;
  const body = { apiSecret };
  upstreams.users.request({ method, url, body }, callback);
};

const directory = async (userId, callback) => {
  if (!upstreams.directory)
    return setImmediate(callback, new Error('directory service is not configured'));

  const method = 'get';
  const url = `/users/id/${encodeURIComponent(userId)}`;
  const qs = {secret: apiSecret};

  upstreams.directory.request({method, url, qs}, callback);
};

module.exports = {
  balance,
  transactions,
  avatar,
  metadata,
  reward,
  banInfo,
  banSetTrue,
  banSetFalse,

  profile: (username, callback) => {
    const bind = fn => fn.bind(null, username);
    const ignoreError = fn => (cb) => fn((err, data) => cb(null, data));

    async.parallel({
      balance: bind(balance),
      transactions: bind(transactions),
      banInfo: bind(banInfo),
      avatar: ignoreError(bind(avatar)),
      metadata: ignoreError(bind(metadata)),
      directory: ignoreError(bind(directory))
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
