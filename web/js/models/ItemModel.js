define(function (require) {
  'use strict';
 

  var ItemModel = Backbone.Model.extend({

    idAttribute: 'id',
    urlRoot: '../api/item',

    defaults: {
      title: '',
      description: '',
      price: '',
      currency: false
    },

    initialize:function () {
    }

  });
  
  return ItemModel;
});