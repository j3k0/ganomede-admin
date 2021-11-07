'use strict';

const express = require('express');

const router = new express.Router();

//
// Ping endpoint
//

const ping = function (req, res) {
  res.send("pong/" + req.params.token);
};

router.get("/:token", ping);

module.exports = router;
