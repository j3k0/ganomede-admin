  'use strict';

  var Backbone = require('backbone');
  var UserModel = Backbone.Model.extend({

    idAttribute: 'id',
    urlRoot: '../api/user',

    initialize:function () {
    }

  });

  module.exports = UserModel;
