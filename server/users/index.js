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

module.exports = router;
