define(function (require) {
  'use strict';
 

  var ItemModel = Backbone.Model.extend({

    idAttribute: 'id',
    urlRoot: 'api/item',

    defaults: {
      id: '',
      title: '',
      description: '',
      price: '',
      currency: ''
    },

    initialize:function () {
    }

  });
  
  return ItemModel;
});