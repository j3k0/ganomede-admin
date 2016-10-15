'use strict';

const url = require('url');
const http = require('http');
const request = require('request');
const log = require('./log');

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

  logError () {
    const message = `Upstream(${this.prefix}) failed`;
    const args = [message].concat(Array.prototype.slice.call(arguments, 0));
    log.error.apply(log, args);
  }

  request (options, callback) {
    options.url = options.url
      ? this.prefix + options.url
      : this.prefix;

    options.json = true;

    request(options, (err, res, body) => {
      // Check network errors.
      if (err) {
        this.logError(err);
        return callback(this.createError(err));
      }

      // Check status code is 2xx
      if (!/^2\d{2}$/.test(String(res.statusCode))) {
        const reason = `HTTP ${res.statusCode}: ${http.STATUS_CODES[res.statusCode]}`;
        this.logError(reason);
        return callback(this.createError(reason, body));
      }

      callback(null, body);
    });
  }
}

module.exports = {
  clonePlainObject,
  Upstream
};
