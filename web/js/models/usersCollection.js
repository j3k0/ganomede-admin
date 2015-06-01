/*
The collection of all the items of a country.
The collection is fetched through the api following the country code.
*/
define(function (require) {
  'use strict';

  var UserModel = require("./userModel.js");
  var config = require("../config");
  
  var UsersCollection = Backbone.Collection.extend({
    model: UserModel,

    initialize: function(models, options) {
      this.url = '../api/users' ;//config.apiUrl + "/getAll";
    },
    findByName: function (key) {
      this.reset(UsersCollection.singleton().filter(function(user){
        return user.get("username").toLowerCase().includes(key.toLowerCase()); 
      }));
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

  return UsersCollection;

});