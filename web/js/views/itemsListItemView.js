define(function (require) {
  'use strict';

  var template = require("../text!../../templates/itemsListItemView.html");
  var ajaxHandler = require("../ajaxHandler");
  var ItemView = require("./itemView");

  var ItemsListItemView = Backbone.View.extend({

    
    tagName:"a",
    className: "list-group-item",
    template: _.template(template),

    initialize:function () {
      this.model.bind("change", this.render, this);
      this.model.bind("destroy", this.close, this);
    },

    events: {
      "click .delete-button": "deleteItem",
      "click .edit-button": "editItem"
    },

    deleteItem: function(ev){
      this.model.destroy();
    },

    editItem: function(ev){
      ev.preventDefault();
      var itemView = new ItemView({model: this.model, mode: 'Edit'});
      $(this.el).append(itemView.render().el);
      itemView.show();
    },

    render:function () {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    }

  });
  return ItemsListItemView;

});