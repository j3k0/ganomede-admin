  'use strict';

  var ajaxHandler = require("../../ajaxHandler");

  var Documentation = {

    getData: function(url, callback) {
      var that = this;
      ajaxHandler.postAjax({
        url: url || '../cms',
        contentType: "application/json; charset=utf-8",
        success: function(d) {
          if (callback) callback(d);
        },
        error: function(resp) {
          console.log(resp);
        }
      });
    },
    replaceAll: function (find, replace, str) {
      return str.replace(new RegExp(find, 'g'), replace);
    }

  };

  module.exports = Documentation;
