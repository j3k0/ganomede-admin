'use strict';

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

module.exports = {
  safeRequestPipe
};
