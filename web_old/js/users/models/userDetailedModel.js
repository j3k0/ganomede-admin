  'use strict';

  var Backbone = require('backbone');
  var ajaxHandler = require("../../ajaxHandler.js");

  var UserDetailedModel = Backbone.Model.extend({

    defaults: {
      username: '',
      email: '',
      photo: '',
      banned: false
    },

    idAttribute: 'id',
    urlRoot: '../api/user/',//config.apiUrl + "/user",

    initialize:function () {

    },

    ban: function(b, success, error){
      var that = this;
      ajaxHandler.postAjax({
        url: that.urlRoot + "ban/" + that.id,// config.locationUrl.replace("userId", that.id),
        type: 'POST',
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({banned: b}),
        success: function (data){
          if(typeof data === "string")
          {
            data = JSON.parse(data);
          }

          if(data.success === true){
            that.set('banned', b);
            if(success){ success(data)};
          }else{
            error(data.message);
          }
        },
        error: function (resp){
          if(error)
            error(resp);
        }
      });
    },

    getLocation: function(){
      var that = this;
      ajaxHandler.postAjax({
        url: "../api/location/" + that.id,// config.locationUrl.replace("userId", that.id),
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (data){
          if(typeof data === "string")
          {
            data = JSON.parse(data);
          }
          that.location = data.value;
          that.trigger('change');
        },
        error: function (resp){
          console.log(resp);
        }
      });
    }

  });

  module.exports = UserDetailedModel;
