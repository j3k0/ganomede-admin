'use strict';

const express = require('express');
const helpers = require('./helpers');

const router = new express.Router();

router.get('/:username', function (req, res, next) {
  helpers.profile(req.params.username, (err, profile) => {
    if (err)
      return next(err);

    const reply = Object.assign(
      {username: req.params.username},
      profile,
      {balance: profile.balance.reduce((prev, currencyCount) => {
        prev[currencyCount.currency] = currencyCount.count;
        return prev;
      }, {})}
    );

    res.json(reply);
  });
});

module.exports = router;
