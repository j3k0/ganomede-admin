define(function (require) {
  'use strict';

  var template = require("../text!../../templates/userDetailsView.html");
  

  var UserDetailsView = Backbone.View.extend({

    template: _.template(template),

    initialize:function () {
      this.model.bind("change", this.render, this);
    },

    render:function () {
      $(this.el).html(this.template({user: this.model.toJSON(), location: this.model.location}));
      return this;
    }

  });

  return UserDetailsView;
});