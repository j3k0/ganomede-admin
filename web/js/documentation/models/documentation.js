define(function(require) {
  'use strict';

  var ajaxHandler = require("../../ajaxHandler");

  var Documentation = {

    getData: function(url, callback) {

      ajaxHandler.postAjax({
        url: url || '/cms/admin/v1',
        contentType: "application/json; charset=utf-8",
        success: function(d) {
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