  'use strict';

  module.exports = {
    allowEmptyAjaxResponse: function() {
      $.ajaxSetup({dataFilter: function(data, type) {
        if (type === "json" && data === "") {
          data = null;
        }
        return data;
      }});
    },

    registerAjaxErrorHandlers: function() {
      $( document ).ajaxError(function(event, jqXHR/*, ajaxSettings, thrownError*/) {
      var ouches = [ "Ow", "Owie", "Youch", "Yow", "Yowch", "Ouch", "Oops" ];
        if (jqXHR && !jqXHR.responseJSON) {
          swal(ouches[Math.floor(Math.random() * ouches.length) | 0] + "...",
                          "Could not connect. Please try again later.",
                          "error");
        }
      });
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
