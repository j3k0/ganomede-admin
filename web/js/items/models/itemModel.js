'use strict';

var Backbone = require('backbone');
var utils = require('../../utils');

var ItemModel = Backbone.Model.extend({
  urlRoot: utils.apiPath('/items')
});

module.exports = ItemModel;
