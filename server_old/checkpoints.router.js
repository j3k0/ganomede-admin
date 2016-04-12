'use strict';

const express = require('express');
const request = require('request');

const API_CHECKPOINTS_URL = process.env.API_CHECKPOINTS_URL || "http://192.168.59.103" || "http://zalka.fovea.cc:49660";
const router = new express.Router();

router.get(/^\/checkpoints\/v1\/(.+)$/, function (req, res) {
    request(API_CHECKPOINTS_URL + req.url).pipe(res);
});

module.exports = router;
