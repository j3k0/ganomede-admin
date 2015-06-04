define(function (require) {
  'use strict';

  var template = require("../../text!../../../templates/monitoring.html");
  var ServersListView = require("./serversListView");


  var MonitoringView = Backbone.View.extend({

    template: _.template(template),

    events: {

    },

    initialize:function () {
      this.serversView = new ServersListView({collection: this.collection, className: 'list-group'});
    },


    render:function () {
      $(this.el).html(this.template());
      this.$('.servers', this.el).append(this.serversView.render().el);
      return this;
    }

  });
  return MonitoringView;

});