'use strict';

const express = require('express');
const request = require('request');

const API_BASE_URL = process.env.API_BASE_URL || "https://staging.ggs.ovh";
const router = new express.Router();

//get location
router.get('/location/:id', function (req, res) {
  request(`${API_BASE_URL}/users/v1/${req.params.id}/metadata/location`).pipe(res);
});

module.exports = router;
