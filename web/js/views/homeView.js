define(function (require) {
  'use strict';

  var template = require("../text!../../templates/homeView.html");
  var HomeView = Backbone.View.extend({

    template: _.template(template),

    initialize:function () {
        console.log('Initializing Home View');
    },

    render:function () {
        $(this.el).html(this.template());
        return this;
    }

  });
  return HomeView;

});