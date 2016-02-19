'use strict';

exports.generateToken = function(len) {
  const buf = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charlen = chars.length;

  for (let i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

const getRandomInt = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

exports.findByUsername = function(username, users, fn) {
  for (let i = 0, len = users.length; i < len; i++) {
    const user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
};

exports.consumeToken = function(token, tokens, fn) {
  const username = tokens[token];
  // invalidate the single-use token
  //delete tokens[token];
  return fn(null, username);
};

exports.removeToken = function(token, tokens) {
  // invalidate the single-use token
  delete tokens[token];
};

exports.saveToken = function(token, username, tokens, fn) {
  for (let key in tokens) {
     if (tokens.hasOwnProperty(key)) {
      delete tokens[key];
     }
  }
  tokens[token] = username;
  return fn();
};
