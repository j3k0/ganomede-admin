/*
The collection of all the items of a country.
The collection is fetched through the api following the country code.
*/
define(function (require) {
  'use strict';

  var ajaxHandler = require("../ajaxHandler");

  var SrevicesModel =  Backbone.Model.extend({

     defaults: {
      name: '',
      url: ''
    },

    initialize:function () {
    }

  });

  
  var ServicesCollection = Backbone.Collection.extend({
    model: SrevicesModel,

    initialize: function(models, options) {
      this.url = 'api/links/' + options.key;
    }
  });

  var all = {};

  ServicesCollection.singleton = function(key) {
    var services = all[key];
    if (!services) {
      services = new ServicesCollection([], {key: key});
      all[key] = services;
    }
    services.fetch({
              reset: true,                
              success: function(d){
              },
              error: function(m, r){
                ajaxHandler.errorFetchOrSave(m, r);
              }
            });
    
    return services;
  };

  return ServicesCollection;

});