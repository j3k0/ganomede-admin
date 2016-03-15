  'use strict';

  var ItemsListItemView = require("./itemsListItemView");

  var ItemsListView = Backbone.View.extend({

    tagName:'div',

    className:'list-group',

    initialize:function () {
        var self = this;
        this.collection.bind("reset change remove", this.render, this);
        this.collection.bind("add", function (item) {
            $(self.el).append(new ItemsListItemView({model: item}).render().el);
        });
    },

    render:function () {
        $(this.el).empty();
        _.each(this.collection.models, function (item) {
             $(this.el).append(new ItemsListItemView({model: item}).render().el);
        }, this);
        return this;
    }
  });
module.exports = ItemsListView;
