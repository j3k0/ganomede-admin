'use strict';

const express = require('express');
const request = require('request');

const API_TEMP_URL = process.env.API_TEMP_URL || "http://private-194a93-ganomedeadmin.apiary-mock.com";
const router = new express.Router();

router.delete('/item/:id', function (req, res) {
    request.del(API_TEMP_URL + req.url).pipe(res);
});

router.get('/items/:name', function (req, res) {
    request(`${API_TEMP_URL}/api/items/${req.params.name}`).pipe(res);
});

router.get('/items', function (req, res) {
  request(`${API_TEMP_URL}/api/items`).pipe(res);
});

router.put('/item/:id', function (req, res) {
  request.put(`${API_TEMP_URL}/api/item/${req.params.id}`).pipe(res);
});

router.post('/item', function (req, res) {
  request.post(API_TEMP_URL + req.url).pipe(res);
});

module.exports = router;
