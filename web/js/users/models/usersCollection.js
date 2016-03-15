/*
The collection of all the items of a country.
The collection is fetched through the api following the country code.
*/
  'use strict';

  var UserModel = require("./userModel.js");
  var ajaxHandler = require("../../ajaxHandler");

  var UsersCollection = Backbone.Collection.extend({
    model: UserModel,

    initialize: function(models, options) {
      this.url = '../api/users' ;//config.apiUrl + "/getAll";
    },
    findByName: function (key) {
      // this.reset(UsersCollection.singleton().filter(function(user){
      //   return user.get("username").toLowerCase().includes(key.toLowerCase());
      // }));
      var that = this;
      ajaxHandler.postAjax({
        url: that.url + "/" + key,
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (d){
          if(typeof d === "string")
          {
            d = JSON.parse(d);
          }
          that.reset(d);
        },
        error: function (resp){
          that.reset();
        }
      });
    }
  });

  var all;

  UsersCollection.singleton = function() {
    var users = all;
    if (!users) {
      all = new UsersCollection([], {});
    }
    return all;
  };

  module.exports UsersCollection;
