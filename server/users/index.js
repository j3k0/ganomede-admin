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

const banSet = (isBanned) => (req, res, next) => {
  helpers.banSet(req.params.username, isBanned, (err) => {
    if (err)
      return next(err);

    res.sendStatus(200);
  });
};

router.post('/:username/ban', banSet(true));
router.post('/:username/unban', banSet(false));

module.exports = router;
