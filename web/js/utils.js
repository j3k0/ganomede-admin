'use strict';

var React = require('react');
var ReactDOMServer = require('react-dom/server');
var swal = require('sweetalert');
var request = require('request');
var url = require('url');
var moment = require('moment');
const {awaitable} = require('awaitability');
const passwordGenerator = require('password-generator');
var Debug = require('./components/Debug.jsx');

var utils = {
  prefixPath: function (modul, path) {
    return '/admin/v1/' + modul + path;
  },

  webPath: function (path) {
    return this.prefixPath('web', path);
  },

  apiPath: function (path) {
    return this.prefixPath('api', path);
  },

  // Returns Promise in case callback is not provided (resolves to `[res, body]`).
  // Otherwise this is just a wrapper for `request` module.
  xhr: function (options, callback) {
    // Allow GET string via `xhr('http://example.com')`
    if (typeof options === 'string') {
      options = {
        url: options,
        method: 'GET'
      };
    }

    options.url = url.resolve(String(window.location.origin), options.url);

    // gzip does not play well with browsers.
    if (options.hasOwnProperty('gzip')) {
      console.warn('utils.xhr() replaced `options.gzip` with `false`; see https://github.com/j3k0/ganomede-admin/issues/38 and https://github.com/j3k0/ganomede-admin/issues/41 for details on why setting it to `true` is dodgy.');
      options.gzip = false;
    }

    // Parse JSON by default, unless we were asked not to.
    if (!options.hasOwnProperty('json'))
      options.json = true;

    return callback
      ? request(options, callback)
      : awaitable.spread(request, options);
  },

  reactToStaticHtml: function (node) {
    return ReactDOMServer.renderToStaticMarkup(node);
  },

  errorToHtml: function (error) {
    var isUpstream = error && error.name === 'UpstreamError';
    var errorText = isUpstream ? error.reason : (error.message || error);
    var errorTitle = isUpstream ? error.message : null;

    return utils.reactToStaticHtml(
      <div>
        {errorTitle && <div>{errorTitle}<br/><br/></div>}
        <Debug.pre data={utils.prettyPrintError(errorText)}/>
      </div>
    );
  },

  xhrMessages: ({errorTitle, successTitle}) => {
    const success = (text) => swal(
      successTitle,
      text ? JSON.stringify(text) : null,
      'success'
    );
    const error = (err) => swal({
      type: 'error',
      title: errorTitle,
      text: '<div>' + utils.errorToHtml(err) + '</div>',
      html: true
    });

    return {success, error};
  },

  // Saves @model with updated @attributes.
  // Mergres in custom @xhrOptions.
  // Shows SweetAlert message after XHR completes using @messages.
  // Calls @callback after XHT completes.
  //
  // callback(failedBoolean)
  saveModel: function (model, attributes, xhrOptions, messages, callback) {
    var cb = callback instanceof Function
      ? callback
      : function () {};

    var {success, error} = utils.xhrMessages({
      errorTitle: messages.error,
      successTitle: messages.success
    });

    var options = Object.assign({
      success: function () {
        success();
        cb(false);
      },

      error: function (model, response, options) {
        error(options.xhr.responseJSON || options.xhr.responseText);
        cb(true);
      }
    }, xhrOptions);

    model.save(attributes, options);
  },

  // Pass in Backbone.View constructor to wrap it in a way,
  // that will call .destroy() on previously created instance.
  //
  // Can be used to render the same view in multiple places:
  //
  //   var OriginalView = require('./some-backbone-view.js');
  //   var SomePage = autodestroyView(OriginalView);
  //   var OtherPage = autodestroyView(OriginalView);
  autodestroyView: function (ctor) {
    var ref = null;

    return function (options) {
      if (ref && ref.destroy instanceof Function)
        ref.destroy();

      ref = new ctor(options);
      return ref;
    };
  },

  formatDate: function (date) {
    return moment(date).format('lll');
  },

  formatDateFromNow: function (date) {
    return moment(date).fromNow();
  },

  prettyPrintError: (error) => {
    const isHtml = (typeof error === 'string' && error.includes('<!DOCTYPE html>'));

    return isHtml
      ? error.replace(/(?:\\n|<br>)/g, '\n')
      : JSON.stringify(error, null, 2);
  },

  passwordSuggestion () {
    // 10 memorable letters + 2 digits
    return passwordGenerator(10) + passwordGenerator(2, false, /^[\d]+$/);
  }
};

module.exports = utils;
