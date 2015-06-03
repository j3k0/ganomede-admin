define(function (require) {
  'use strict';

  var template = require("../text!../../templates/monitoring.html");
  var ItemsListView = require("./itemsListView");
  var ItemModel = require("../models/itemModel");
  var ItemView = require("./itemView");


  var MonitoringView = Backbone.View.extend({

    template: _.template(template),

    events: {

    },

    initialize:function () {
      this.searchresultsView = new ItemsListView({collection: this.collection, className: 'list-group'});
    },


    render:function () {
      $(this.el).html(this.template());
      this.$('.servers', this.el).append(this.searchresultsView.render().el);
      return this;
    }

  });
  return MonitoringView;

});