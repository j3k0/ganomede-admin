define(function (require) {
  'use strict';

  var template = require("../text!../../templates/itemsListItemView.html");

  var ItemsListItemView = Backbone.View.extend({

    
    tagName:"a",
    className: "list-group-item",
    template: _.template(template),

    initialize:function () {
      this.model.bind("change", this.render, this);
      this.model.bind("destroy", this.close, this);
    },

    events: {
      "click .delete-button": "deleteItem"
    },

    deleteItem: function(ev){
      this.model.destroy();
    },

    render:function () {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    }

  });
  return ItemsListItemView;

});