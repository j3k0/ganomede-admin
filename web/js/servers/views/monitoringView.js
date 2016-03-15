  'use strict';

  var template = require("../../text!../../../templates/monitoring.html");
  var ServersListView = require("./serversListView");

  var ServicesCollection = require("../../models/servicesCollection");

  var MonitoringView = Backbone.View.extend({

    template: _.template(template),

    events: {
      'click .refresh-button': 'refresh'
    },

    initialize: function () {
      this.serversView = new ServersListView({
        collection: this.collection,
        className: 'list-group'
      });
      var that = this;
      // this.refreshInterval = setInterval(function(){
      //  that.collection.fetch();
      // }, 10000);
      this.servicesCollection = ServicesCollection.singleton("servers");
      this.servicesCollection.bind("reset change remove", this.render, this);
    },

    refresh: function () {
      this.collection.fetch();
    },

    remove: function () {
      // Your processing code here
      // clearInterval(this.refreshInterval);
      Backbone.View.prototype.remove.apply(this, arguments);
    },

    renderPanel: function () {
      this.$('.panel-data').remove();
      _.each(this.servicesCollection.models, function (item) {
        this.$('.services-panel').append("<div class=\"panel-body panel-data\"><a target=\"_blank\" href=" + item.get('url') + ">" + item.get('name') + "</a></div>");
      }, this);
    },

    render: function () {
      $(this.el).html(this.template());
      this.$('.servers', this.el).append(this.serversView.render().el);
      this.renderPanel();
      return this;
    }

  });
  module.exports = MonitoringView;
