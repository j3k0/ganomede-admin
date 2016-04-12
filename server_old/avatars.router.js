'use strict';

const express = require('express');
const request = require('request');

const API_BASE_URL = process.env.API_BASE_URL || "https://staging.ggs.ovh";
const router = new express.Router();

router.get(/avatars\/v1\/(.+)$/, function(req, res) {
  request.get(API_BASE_URL + req.url).pipe(res);
});

module.exports = router;
