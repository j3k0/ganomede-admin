'use strict';

const util = require('util');
const express = require('express');
const lodash = require('lodash');
const helpers = require('./helpers');
const UserIdResolver = require('./UserIdResolver');

const router = new express.Router();
const uidResolver = new UserIdResolver();
const fetchProfile = util.promisify(helpers.profile);

// This is a place that receives queries for user profiles.
// But since we use
// Web UI should be fine if we re
// Since we want to lookup multiple things get a tag , all the other things
router.get('/search/:query', async (req, res, next) => {
  try {
    res.json(await uidResolver.resolve(req.params.query));
  }
  catch (ex) {
    next(ex);
  }
});

router.get('/:userId', async (req, res, next) => {
  try {
    // Require exact match for user ID.
    const lookups = await uidResolver.resolve(req.params.userId);
    const idLookupSucceeded = lookups.results.some(r => r.found && r.method === 'byId');
    const uniqueUids = lodash.uniq(lookups.matchingIds);
    const singleExactMatch = idLookupSucceeded && uniqueUids.length === 1 && uniqueUids[0] === req.params.userId;

    if (!singleExactMatch)
      return next(new UserIdResolver.UserIdNotFoundError(req.params.userId));

    res.json(await fetchProfile(req.params.userId));
  }
  catch (ex) {
    next(ex);
  }
});

router.post('/:username/rewards', function (req, res, next) {
  helpers.reward(req.params.username, req.body.amount, req.body.currency, (err, transaction) => {
    if (err)
      return next(err);

    res.json(transaction);
  });
});

const banSet = (isBanned) => (req, res, next) => {
  const method = `banSet${isBanned}`;
  helpers[method](req.params.username, (err) => {
    if (err)
      return next(err);

    res.sendStatus(200);
  });
};

router.post('/:username/ban', banSet('True'));
router.post('/:username/unban', banSet('False'));

module.exports = router;
