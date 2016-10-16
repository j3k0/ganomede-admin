'use strict';

var React = require('react');
var ReactDOMServer = require('react-dom/server');
var underscore = require('underscore');
var swal = require('sweetalert');
var request = require('request');
var url = require('url');
var moment = require('moment');
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

  xhr: function (options, callback) {
    options.url = url.resolve(String(window.location.origin), options.url);
    options.json = true;
    request(options, callback);
  },

  errorToHtml: function (error) {
    var isUpstream = error && error.name === 'UpstreamError';
    var errorText = isUpstream ? error.reason : error;
    var errorTitle = isUpstream ? error.message : 'Server Error';

    return ReactDOMServer.renderToStaticMarkup(
      <div>
        <div>{errorTitle}</div>
        <br/>
        <Debug.pre data={errorText}/>
      </div>
    );
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

    var options = underscore.assign({
      success: function () {
        swal(messages.success, null, 'success');
        cb(false);
      },

      error: function (model, response, options) {
        var error = options.xhr.responseJSON || options.xhr.responseText;

        swal({
          type: 'error',
          title: messages.error,
          text: '<div>' + utils.errorToHtml(error) + '</div>',
          html: true
        });

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
  }
};

module.exports = utils;
