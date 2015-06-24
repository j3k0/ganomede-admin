define(function (require) {
  'use strict';

  var template = require("../../text!../../../templates/documentationView.html");

  var documentation = require("../models/documentation");

  var DocumentationView = Backbone.View.extend({

    template: _.template(template),

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
      documentation.getData(ev.target.href, function(data){
        that.renderHtml(data);
      });
    },

    renderHtml: function(data){
      this.$('.documentation-content').html(data);
    },

    

    render: function () {
      $(this.el).html(this.template());
      return this;
    }

  });
  return DocumentationView;

});