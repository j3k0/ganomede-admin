'use strict';

const express = require('express');

const router = new express.Router();

router.use((req, res) => {
  res.status(501).send('NotImplemented');
});

// //get users list
// router.get('/users', function (req, res) {
//   request(`${API_TEMP_URL}/api/users`).pipe(res);
// });

// //get users list
// router.get('/users/:name', function (req, res) {
//   request(`${API_TEMP_URL}/api/users/${req.params.name}`).pipe(res);
// });

// //get user details
// router.get('/user/:id', function (req, res) {
//   request(API_TEMP_URL + req.url).pipe(res);
// });

// //ban user
// router.post('/user/ban/:id', function (req, res) {
//   request.post(API_TEMP_URL + req.url).pipe(res);
// });

module.exports = router;
