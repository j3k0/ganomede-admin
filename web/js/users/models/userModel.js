  'use strict';


  var UserModel = Backbone.Model.extend({

    idAttribute: 'id',
    urlRoot: '../api/user',

    initialize:function () {
    }

  });

  module.exports = UserModel;
