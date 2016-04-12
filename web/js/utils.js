'use strict';

var underscore = require('underscore');
var swal = require('sweetalert');

module.exports = {
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
        var error = options.xhr.responseJSON;
        var isUpstream = error && error.name === 'UpstreamError';
        var errorText = isUpstream
          ? error.reason
          : (options.xhr.responseJSON || options.xhr.responseText);

        var errorTitle = isUpstream
          ? error.message
          : 'Server Error';

        var body = $('<div>')
          .append($('<div>').text(errorTitle))
          .append('<br/>')
          .append($('<pre class="well">').css('text-align', 'left').text(JSON.stringify(errorText, null, 2)))
          .html();

        swal({
          type: 'error',
          title: messages.error,
          text: '<div>' + body + '</div>',
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
  }
};
