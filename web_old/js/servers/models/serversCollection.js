/*
The collection of all the items of a country.
The collection is fetched through the api following the country code.
*/
  'use strict';

  var Backbone = require('backbone');
  var ServerModel = require("./serverModel.js");

  var ServersCollection = Backbone.Collection.extend({
    model: ServerModel,

    initialize: function(models, options) {
      this.url = '../api/monitoring' ;
    }
  });

  var all;

  ServersCollection.singleton = function() {
    var users = all;
    if (!users) {
      all = new ServersCollection([], {});
    }
    return all;
  };

  module.exports = ServersCollection;
