define(function (require) {
  'use strict';

  var ItemsListItemView = require("./itemsListItemView");

  var ItemsListView = Backbone.View.extend({

    tagName:'div',

    className:'list-group',

    initialize:function () {
        var self = this;
        this.collection.bind("reset change remove", this.render, this);
        this.collection.bind("add", function (user) {
            $(self.el).append(new ItemsListItemView({model:user}).render().el);
        });
    },

    render:function () {
        $(this.el).empty();
        _.each(this.collection.models, function (user) {
             $(this.el).append(new ItemsListItemView({model:user}).render().el);
        }, this);
        return this;
    }
  });
return ItemsListView;

});