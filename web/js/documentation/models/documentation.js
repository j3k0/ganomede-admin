define(function(require) {
  'use strict';

  var ajaxHandler = require("../../ajaxHandler");

  var Documentation = {

    getData: function(url, callback) {
      var that = this;
      ajaxHandler.postAjax({
        url: url || '/cms/admin/v1',
        contentType: "application/json; charset=utf-8",
        success: function(d) {
          if(d){
            d = that.replaceAll("<ul>", '<ul class="list-group">', d);
            d = that.replaceAll("<li>", '<li class="list-group-item">', d);
            d = that.replaceAll("<textarea", '<textarea class="form-control" ', d);
            d = that.replaceAll("<input", '<input class="form-control" ', d);
          }
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

  return Documentation;
});