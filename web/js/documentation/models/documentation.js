define(function(require) {
  'use strict';

  var ajaxHandler = require("../../ajaxHandler");

  var Documentation = {

    getData: function(callback) {

      ajaxHandler.postAjax({
        url: '/cms/admin/v1',
        contentType: "application/json; charset=utf-8",
        success: function(d) {
          console.log(d);
          if (callback) callback(d);
        },
        error: function(resp) {
          console.log(resp);
        }
      });
    }

  };

  return Documentation;
});