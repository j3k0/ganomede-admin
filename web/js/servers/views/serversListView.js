define(function (require) {
  'use strict';

  var ServersListItemView = require("./serversListItemView");

  var ServersListView = Backbone.View.extend({

    tagName:'div',

    className:'list-group',

    initialize:function () {
        var self = this;
        this.collection.bind("reset change remove", this.render, this);
        this.collection.bind("add", function (user) {
            $(self.el).append(new ServersListItemView({model:user}).render().el);
        });
    },

    render:function () {
        $(this.el).empty();
        _.each(this.collection.models, function (user) {
             $(this.el).append(new ServersListItemView({model:user}).render().el);
        }, this);
        return this;
    }
  });
return ServersListView;

});