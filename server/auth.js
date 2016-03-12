'use strict';

const crypto = require('crypto');
const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const config = require('../config');

const router = new express.Router();

const users = {
  store: (function () {
    const ret = {};
    const user = {
      username: config.auth.admin.username,
      password: config.auth.admin.password
    };
    ret[user.username] = user;
    return ret;
  }()),

  findByUsername: function (username) {
    return this.store.hasOwnProperty(username)
      ? this.store[username]
      : null;
  }
};

const tokens = {
  store: (function () {
    const ret = {};

    if (config.auth.admin.token)
      ret[config.auth.admin.token] = config.auth.admin.username;

    return ret;
  }()),

  create: function (username) {
    const token = crypto.randomBytes(32).toString('hex');
    this.store[token] = username;
    return token;
  },

  consume: function (token) {
    return this.store.hasOwnProperty(token)
      ? this.store[token]
      : null;
  },

  remove: function (token) {
    delete this.store[token];
  }
};


passport.serializeUser(function (user, done) {
  done(null, user.username);
});

passport.deserializeUser(function (username, done) {
  done(null, users.findByUsername(username));
});

passport.use(new LocalStrategy(function (username, password, done) {
  const user = users.findByUsername(username);

  return user && (user.password === password)
    ? done(null, user)
    : done(null, false, {message: 'Invalid username or password.'});
}));


const mwValidate = function(req, res, next){
  const token = req.cookies && req.cookies.token;
  const username = tokens.consume(token);
  const user = users.findByUsername(username);

  if (token && username && user)
    return next();

  res.status(401).json({
    success: false,
    error: "Need authentication",
    needAuthentication: true
  });
};

router.post('/login', passport.authenticate('local'), function (req, res) {
  const token = tokens.create(req.body.username);
  res.cookie('token', token, {path: '/', httpOnly: true, maxAge: 604800000});
  res.json({success: true});
});

router.get('/logout', mwValidate, function (req, res){
  tokens.remove(req.cookies.token);
  res.clearCookie('token');
  res.json({success: true});
});

module.exports = {mwValidate, router};
