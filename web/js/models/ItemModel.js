define(function (require) {
  'use strict';
 

  var ItemModel = Backbone.Model.extend({

    idAttribute: 'id',
    urlRoot: '../api/item',

    initialize:function () {
    }

  });
  
  return ItemModel;
});