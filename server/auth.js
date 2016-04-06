'use strict';

const crypto = require('crypto');
const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const config = require('../config');

const router = new express.Router();

const toToken = function (username, password) {
  return crypto
    .createHash('sha256')
    .update(username)
    .update(password)
    .digest('hex');
};

const admin = config.auth.admin;
const adminToken = toToken(admin.username, admin.password);

passport.serializeUser(function (user, done) {
  if (user.username !== admin.username)
    return done(new Error('UknownUser'));

  done(null, user.username);
});

passport.deserializeUser(function (username, done) {
  if (username !== admin.username)
    return done(new Error('UknownUser'));

  done(null, admin);
});

passport.use(new LocalStrategy(function (username, password, done) {
  return adminToken === toToken(username, password)
    ? done(null, admin)
    : done(null, false, {message: 'Invalid username or password.'});
}));


const mwValidate = function(req, res, next){
  if (req.cookies && (req.cookies.token === adminToken))
    return next();

  res.status(401).json({
    success: false,
    error: "Need authentication",
    needAuthentication: true
  });
};

router.post('/login', passport.authenticate('local'), function (req, res) {
  res.cookie('token', adminToken, {path: '/', httpOnly: true, maxAge: 604800000});
  res.json({success: true});
});

router.get('/logout', mwValidate, function (req, res){
  res.clearCookie('token');
  res.json({success: true});
});

module.exports = {mwValidate, router};
