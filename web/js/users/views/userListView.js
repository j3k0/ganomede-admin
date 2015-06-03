define(function (require) {
  'use strict';

  var UserListItemView = require("./userListItemView");

  var UserListView = Backbone.View.extend({

    tagName:'ul',

    className:'nav nav-list',

    initialize:function () {
        var self = this;
        this.collection.bind("reset", this.render, this);
        this.collection.bind("add", function (user) {

            $(self.el).append(new UserListItemView({model:user}).render().el);
        });
    },

    render:function () {
        $(this.el).empty();
        _.each(this.collection.models, function (user) {
             $(this.el).append(new UserListItemView({model:user}).render().el);
        }, this);
        return this;
    }
  });
return UserListView;

});