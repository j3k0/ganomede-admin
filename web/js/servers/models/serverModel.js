define(function (require) {
  'use strict';
 

  var ServerModel = Backbone.Model.extend({

    idAttribute: 'id',

    defaults: {
      type: '',
      version: '',
      config: {},
      host: '',
      port: 8000,
      pingMs: 5
    },

    initialize:function () {
    }

  });
  
  return ServerModel;
});