define(function (require) {
  'use strict';

  var template = require("../text!../../templates/userListItemView.html");

  var UserListItemView = Backbone.View.extend({

    
    tagName:"li",
    className: "list-group-item",
    template: _.template(template),

    initialize:function () {
      this.model.bind("change", this.render, this);
      this.model.bind("destroy", this.close, this);
    },

    render:function () {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    }

  });
  return UserListItemView;

});