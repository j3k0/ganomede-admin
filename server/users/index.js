'use strict';

const util = require('util');
const express = require('express');
const lodash = require('lodash');
const {awaitable} = require('awaitability');
const helpers = require('./helpers');
const UserIdResolver = require('./UserIdResolver');
const upstreams = require('../upstreams');

const router = new express.Router();
const uidResolver = new UserIdResolver();
const fetchProfile = util.promisify(helpers.profile);

//
// Searching for and Display User Profiles
//

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

router.getUsermetaMiddleware = (helperP = helpers, metaList = process.env.USER_METADATA_LIST) => (req, res, next) => {
  try {
    helperP.dynamicMetadata(req.params.username, metaList, (err, metaInfos) => {
      if (err)
        return next(err);

      let result = [];
      let allkeys = (metaList || '').split(',');

      for (let i =0, len = allkeys.length; i < len; i++) {
        let k = allkeys[i];

        if (metaInfos.hasOwnProperty(k)) {
          result.push({
            id: k,
            value: metaInfos[k]
          });
        }else{
          result.push({
            id: k,
            value: ''
          });
        }
      }

      res.json(result);
      next();
    });
  } catch (ex) {
    next(ex);
  }
};

router.get('/:username/usermeta', router.getUsermetaMiddleware());


router.updateMetaDataMiddleWare = (helperP = helpers) => (req, res, next) => {
  try {
    helperP.updateDynamicUserMeta(req.params.username, req.body.id, req.body.value, (err, result) => {
      if (err)
        return next(err);
  
      res.json(result);
      next();
    });
  }
  catch (ex) {
    next(ex);
  }
};

router.put('/:username/usermeta/:key', router.updateMetaDataMiddleWare());

//
// Awarding Currency
//

router.post('/:username/rewards', function (req, res, next) {
  helpers.reward(req.params.username, req.body.amount, req.body.currency, (err, transaction) => {
    if (err)
      return next(err);

    res.json(transaction);
  });
});

//
// Banning
//

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

//
// Changing Password
//

router.post('/:userId/password-reset', async (req, res, next) => {
  if (!upstreams.directory)
    return next(new Error('Directory service required, specify env vars'));

  const sendRequest = upstreams.directory.request.bind(upstreams.directory, {
    method: 'POST',
    url: `/users/id/${req.params.userId}`,
    body: {
      secret: process.env.API_SECRET,
      password: req.body.newPassword
    }
  });

  try {
    await awaitable(sendRequest);
    res.sendStatus(200);
  }
  catch (ex) {
    next(ex);
  }
});

//chat rooms

router.listChatHistory = (helperP = helpers, chatRoomIdPrefix = process.env.CHAT_ROOM_PREFIX) => (req, res, next) => {
  try {
    helperP.chatRooms(req.params.username1, req.params.username2, chatRoomIdPrefix, (err, result) => {
      if (err)
        return next(err);
  
      res.json(result);
      next();
    });
  }
  catch (ex) {
    next(ex);
  }
};

router.get('/chat/:username1/:username2', router.listChatHistory());

router.listReportsAndBlocks = (helperP = helpers) => (req, res, next) => {
  try {
    helperP.reportsAndBlocks(req.params.username, (err, result) => {
      if (err)
        return next(err);

      res.json(result);
      next();
    });
  }
  catch (ex) {
    next(ex);
  }
};

router.get('/reports-blocks/:username', router.listReportsAndBlocks());

router.listHighlyReportedUsers = (helperP = helpers) => (req, res, next) => {
  try {
    helperP.highlyReportedUsers((err, result) => {
      if (err)
        return next(err);

      res.json(result);
      next();
    });
  }
  catch (ex) {
    next(ex);
  }
};

router.get('/highly/reported', router.listHighlyReportedUsers());

module.exports = router;
