'use strict';

var Backbone = require('backbone');
var utils = require('../utils');

var Login = Backbone.Model.extend({
  defaults: {
    loggedIn: false
  },

  // Perform request to auth API
  // @method is one of:
  //   - islogged
  //   - login
  //   - logout
  // @payload is optional json-serializable object
  // @callback is optional
  //
  // callback(err, successBoolean)
  _request: function (method, payload, callback) {
    if (arguments.length === 2) {
      callback = payload;
      payload = undefined;
    }

    callback = callback || function () {};

    var opts = {
      method: (method === 'islogged') ? 'get' : 'post',
      url: utils.apiPath('/' + method),
      body: payload
    };

    utils.xhr(opts, function (err, res, body) {
      if (err)
        return callback(err);

      var success = res.statusCode === 200 && body && body.success;

      // If we succeeded in anything else than logout,
      // it means we are logged in.
      if (success)
        this.set('loggedIn', method !== 'logout');

      callback(null, success);
    }.bind(this));
  },

  // callback(err, isLoggedInBool)
  loggedIn: function (callback) {
    this._request('islogged', callback);
  },

  // callback(err, isSuccessfulBool)
  login: function (credentials, callback) {
    this._request('login', credentials, callback);
  },

  // callback(err, isLoggedOut)
  logout: function (callback) {
    return this._request('logout', callback);
  },

  // callback(model, newLoggedIn, options)
  sub: function (callback) {
    return this.on('change:loggedIn', callback);
  },

  // callback(model, newLoggedIn, options)
  unsub: function (callback) {
    return this.off('change:loggedIn', callback);
  }
});

module.exports = new Login();
