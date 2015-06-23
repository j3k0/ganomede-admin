define(function (require) {
  'use strict';

  // var template = require("../../text!../../../templates/analyticsView.html");

  var documentation = require("../models/documentation");

  var DocumentationView = Backbone.View.extend({

    // template: _.template(template),

    events: {
    },

    initialize:function () {
      var that = this;
      documentation.getData(function(data){
        that.renderHtml(data);
      });
    },

    renderHtml: function(data){
      $(this.el).html(data);
    },

    render: function () {
      $(this.el).html('');
      return this;
    }

  });
  return DocumentationView;

});