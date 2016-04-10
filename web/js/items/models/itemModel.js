'use strict';
var Backbone = require('backbone');
var ItemModel = Backbone.Model.extend({
  urlRoot: '../api/items'
});

module.exports = ItemModel;
