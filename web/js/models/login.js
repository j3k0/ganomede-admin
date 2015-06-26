define(function (require) {
  'use strict';

  var ajaxHandler = require("../ajaxHandler");

  var Login = {

    url: "../api/login",

    isLoggedIn: function(){
      ajaxHandler.postAjax({
        url: "../api/islogged",
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (data){

        },
        error: function (resp){
          
        }
      });
    },

    logout: function(){
      ajaxHandler.postAjax({
        url: "../api/logout",
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (data){
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          console.log(data);
          if(data.success)
            Backbone.history.navigate('', {trigger: true});
        },
        error: function (resp){
          
        }
      });
    },

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