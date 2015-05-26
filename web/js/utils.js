define(function () {
  'use strict';

  return {

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
    }

  };
});