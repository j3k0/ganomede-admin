define(function (require) {
  'use strict';

  var config = require('../config');

  var UserModel = Backbone.Model.extend({

    idAttribute: 'id',
    urlRoot: config.apiUrl + '/user',

    initialize:function () {
    }

  });
  
  return UserModel;
});