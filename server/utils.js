'use strict';

const url = require('url');
const http = require('http');
const request = require('request');
const log = require('./log');

/**
 * Safely pipe from upstream services to Express Responses.
 * Safe in a way that it will log an error and send back HTTP 500
 * instead of crashing the process in case there is an upstream failure.
 *
 * Has shorthands like:
 *
 *   safeRequestPipe[http-verb](url, destinationStream)
 *   safeRequestPipe.get('http://example.com', res);
 *
 * @param  {Object} options request() options
 * @param  {Stream} dst     Express Response
 */
const safeRequestPipe = function (options, dst) {
  request(options)
    .on('error', err => {
      const error = 'UpstreamError';
      log.error(error, err);
      dst
        .status(500)
        .json({error});
    })
    .on('response', res => {
      res.pipe(dst);
    });
};

(function () {
  // build shorthands like safeRequestPipe.get…
  ['get', 'post', 'put'].forEach(verb => {
    const method = verb.toUpperCase();
    safeRequestPipe[verb] = (url, dst) => safeRequestPipe({method, url}, dst);
  });
}());

/**
 * Cloning of plain objects (Arrays, Object, other standard JS instances).
 * Won't work with descendat classes.
 */
const clonePlainObject = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Speaking to upstream JSON API services without throwing
 * in cases when they are not available or similar ones.
 *
 * Expects status 2xx status codes and well-formed JSON.
 */

class Upstream {
  constructor (urlParams) {
    const formatted = url.format(urlParams);
    this.prefix = formatted[formatted.length - 1] === '/'
      ? formatted.slice(0, -1)
      : formatted;
  }

  createError (reason, body) {
    const error = new Error(String(reason));
    error.name = 'UpstreamError';
    error.reason = body || reason;
    return error;
  }

  request (options, callback) {
    options.url = options.url
      ? `${this.prefix}/${options.url}`
      : this.prefix;

    options.json = true;

    request(options, (err, res, body) => {
      // Check network errors.
      if (err)
        return callback(this.createError(err));

      // Check status code is 2xx
      if (!/^2\d{2}$/.test(String(res.statusCode))) {
        const reason = `HTTP ${res.statusCode}: ${http.STATUS_CODES[res.statusCode]}`;
        return callback(this.createError(reason, body));
      }

      callback(null, body);
    });
  }
}

module.exports = {
  safeRequestPipe,
  clonePlainObject,
  Upstream
};
