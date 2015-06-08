define(function (require) {
  'use strict';

  var template = require("../../text!../../../templates/itemsView.html");
  var ItemsListView = require("./itemsListView");
  var ItemModel = require("../models/itemModel");
  var ItemView = require("./itemView");


  var ItemsView = Backbone.View.extend({

    template: _.template(template),

    events: {
      "click .new-button": "newItem"
    },

    initialize:function () {
      this.searchresultsView = new ItemsListView({collection: this.collection, className: 'list-group'});
    },

    newItem: function(event){
      event.preventDefault();
      var itemView = new ItemView({model: new ItemModel(), mode: 'New', collection: this.collection});
      $(this.el).append(itemView.render().el);
      itemView.show();
    },

    render:function () {
      $(this.el).html(this.template());
      $('.search-results', this.el).append(this.searchresultsView.render().el);
      return this;
    }

  });
  return ItemsView;

});