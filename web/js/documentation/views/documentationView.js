define(function (require) {
  'use strict';

  // var template = require("../../text!../../../templates/analyticsView.html");

  var documentation = require("../models/documentation");

  var DocumentationView = Backbone.View.extend({

    // template: _.template(template),

    events: {
      'click a[href^="/"]': "clickLink"
    },

    initialize:function () {
      var that = this;
      documentation.getData(null, function(data){
        that.renderHtml(data);
      });
    },

    clickLink: function(ev){
      ev.preventDefault();
      var that = this;
      console.log(ev.target.href);
      documentation.getData(ev.target.href, function(data){
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