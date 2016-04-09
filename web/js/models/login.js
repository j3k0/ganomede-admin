  'use strict';

  var url = require('url');
  var request = require('request');
  var Backbone = require('backbone');

  var Login = Backbone.Model.extend({
    defaults: {
      loggedIn: false
    },

    _resolveUrl: function (method) {
      return url.resolve(String(window.location), '../api/' + method);
    },

    // Perform request to auth API
    // @verb and @url is one of:
    //   - get islogged
    //   - post login
    //   - get logout
    // @payload is optional json-serializable object
    // @callback is optional
    //
    // callback(err, successBoolean)
    _request: function (verb, url, payload, callback) {
      if (arguments.length === 3) {
        callback = payload;
        payload = undefined;
      }

      callback = callback || function () {};

      var opts = {
        method: verb,
        url: this._resolveUrl(url),
        json: true,
        body: payload
      };

      request(opts, function (err, res, body) {
        if (err)
          return callback(err);

        var success = res.statusCode === 200 && body && body.success;

        // If we succeeded in anything else than logout,
        // it means we are logged in.
        if (success)
          this.set('loggedIn', url !== 'logout');

        callback(null, success);
      }.bind(this));
    },

    // callback(err, isLoggedInBool)
    loggedIn: function (callback) {
      this._request('get', 'islogged', callback);
    },

    // callback(err, isSuccessfulBool)
    login: function (credentials, callback) {
      this._request('post', 'login', credentials, callback);
    },

    // callback(err, isLoggedOut)
    logout: function (callback) {
      return this._request('post', 'logout', callback);
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
