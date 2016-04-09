'use strict';

const express = require('express');

const router = new express.Router();

router.use('/items', require('./items.router'));

module.exports = router;
