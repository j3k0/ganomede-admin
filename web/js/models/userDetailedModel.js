define(function (require) {
  'use strict';

  var config = require('../config');
  var ajaxHandler = require("../ajaxHandler.js");

  var UserDetailedModel = Backbone.Model.extend({

    defaults: {
      username: '',
      email: '',
      photo: ''
    },

    idAttribute: 'id',
    urlRoot: '../admin/user/details/',//config.apiUrl + "/user",

    initialize:function () {
    	
    },

    getLocation: function(){
      var that = this;
      ajaxHandler.postAjax({
        url: "../admin/location/" + that.id,// config.locationUrl.replace("userId", that.id),
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (data){
          console.log(data);
          data = JSON.parse(data);
          that.location = data.value;
          that.trigger('change');
        },
        error: function (resp){
          console.log(resp);
        }
      });
    }
    
  });

  return UserDetailedModel;
});