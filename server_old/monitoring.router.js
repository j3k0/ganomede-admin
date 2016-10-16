'use strict';

const express = require('express');
const request = require('request');

const API_BASE_URL = process.env.API_BASE_URL || "https://staging.ggs.ovh";
const router = new express.Router();

router.get('/monitoring', function (req, res) {
    request(`${API_BASE_URL}/registry/v1/services`).pipe(res);
});

module.exports = router;
