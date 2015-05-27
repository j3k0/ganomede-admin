define(function (require) {
  'use strict';

  var config = require('../config');

  var UserDetailedModel = Backbone.Model.extend({

    defaults: {
      username: '',
      name: '',
      phone: '',
      email: '',
      photo: ''
    },

    idAttribute: 'id',
    urlRoot: config.apiUrl + "/user",

    initialize:function () {
    	
    }
    
  });

  return UserDetailedModel;
});