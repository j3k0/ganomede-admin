define(function (require) {
  'use strict';

  var ajaxHandler = require("../ajaxHandler");

  var Login = {

    url: "api/login",

    postAjax: function(username, password, success, error){
      var that = this;
      ajaxHandler.postAjax({
        url: that.url,
        type: 'POST',
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({username: username, password: password}),
        success: function (data){
          if(success){
            success(data);
          }
        },
        error: function (resp){
          if(error){
            error(resp);
          }
        }
      });
    }
    
  };

  return Login;
});