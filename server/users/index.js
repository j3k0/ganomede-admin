'use strict';

const express = require('express');
const helpers = require('./helpers');

const router = new express.Router();

router.get('/:username', function (req, res, next) {
  helpers.profile(req.params.username, (err, profile) => {
    if (err)
      return next(err);

    res.json(profile);
  });
});

router.post('/:username/rewards', function (req, res, next) {
  helpers.reward(req.params.username, req.body.amount, req.body.currency, (err, transaction) => {
    if (err)
      return next(err);

    res.json(transaction);
  });
});

module.exports = router;
