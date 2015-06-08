/*
The collection of all the items of a country.
The collection is fetched through the api following the country code.
*/
define(function (require) {
  'use strict';

  var ItemModel = require("./itemModel.js");
  var ajaxHandler = require("../../ajaxHandler");
  
  var ItemsCollection = Backbone.Collection.extend({
    model: ItemModel,

    initialize: function(models, options) {
      this.url = '../api/items' ;
    }
  });

  var all;

  ItemsCollection.singleton = function() {
    var users = all;
    if (!users) {
      all = new ItemsCollection([], {});
    }
    return all;
  };

  return ItemsCollection;

});