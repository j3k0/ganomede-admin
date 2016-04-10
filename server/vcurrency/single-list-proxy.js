'use strict';

// Proxying Single List APIs
// of vcurrency module.

const express = require('express');
const utils = require('../utils');
const upstreams = require('../upstreams');

const upstream = upstreams.virtualcurrency;

// Build a body to pass upstream to vcurrency server:
//   - add `secret`, if not pressent.
const cloneWithSecret = (expressBody) => {
  const payload = utils.clonePlainObject(expressBody);
  payload.secret = payload.secret || process.env.API_SECRET;
  return payload;
};

// Proxy requesst to vcurrency API backed by single list doc
// (packs, items, etc.)
const pipeToSingleListApi = (method, url, additionalOptions, postProcess) => {
  return (req, res) => {
    const body = req.body
      ? cloneWithSecret(req.body)
      : undefined;

    const options = Object.assign(
      {method, url, body},
      additionalOptions || {}
    );

    upstream.request(options, (err, body) => {
      if (err)
        return res.status(500).json(err);

      const response = postProcess instanceof Function
        ? postProcess(body)
        : body;

      res.json(response);
    });
  };
};

// Creater router for proxying backbone's collections' requests
// to single list APIs.
//
// @urls is list an object of {method: url} format
// @postProcessGet is optional functions for modifying result of listing.
const singleListRouter = (urls, postProcessGet) => {
  const router = new express.Router();

  router.get('/', pipeToSingleListApi('get', urls.get, {qs: {limit: 500}}, postProcessGet));
  router.post('/:id', pipeToSingleListApi('post', urls.post));
  router.put('/:id', pipeToSingleListApi('put', urls.put));

  return router;
};

module.exports = singleListRouter;
