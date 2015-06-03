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
    },
    findByName: function (key) {
      var that = this;
      ajaxHandler.postAjax({
        url: that.url + "/" + key,
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (data){
          that.reset(data);
        },
        error: function (resp){
          console.log(resp);
        }
      });
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