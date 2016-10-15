/*
The collection of all the items of a country.
The collection is fetched through the api following the country code.
*/
  'use strict';

  var Backbone = require('backbone');
  var ItemModel = require("./itemModel.js");
  var utils = require('../../utils');

  var ItemsCollection = Backbone.Collection.extend({
    model: ItemModel,
    url: utils.apiPath('/items'),

    parse: function (result) {
      // Server responds with list of currencies and items.
      // Remember currencies and return items as attributes for models.
      this.currencies = result.currencies;
      return result.items;
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

  module.exports = ItemsCollection;
