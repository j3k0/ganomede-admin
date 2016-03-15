  'use strict';

  var fs = require('fs');
  var template = fs.readFileSync(__dirname + "/../../../templates/userListItemView.html", 'utf8');

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
  module.exports = UserListItemView;
