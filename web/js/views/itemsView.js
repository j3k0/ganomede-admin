define(function (require) {
  'use strict';

  var template = require("../text!../../templates/itemsView.html");
  var ItemsCollection = require("../models/itemsCollection");
  var ItemsListView = require("./itemsListView");
  var ItemModel = require("../models/itemModel");
  var ItemView = require("./itemView");


  var ItemsView = Backbone.View.extend({

    template: _.template(template),

    events: {
      "click .search-button": "search",
      "keypress .search-query": "onkeypress",
      "click .new-button": "newItem"
    },

    initialize:function () {
      this.searchResults = new ItemsCollection();
      this.searchresultsView = new ItemsListView({collection: this.searchResults, className: 'list-group'});
    },

    search: function () {
      var name = $('#searchText').val();
      // console.log('search ' + name);
      if(name === '')
      {
        this.searchResults.reset();
        return;
      }
      this.searchResults.findByName(name);
    },

    onkeypress: function (event) {
      if (event.keyCode == 13) {
        event.preventDefault();
        this.search();
      }
    },

    closeModal: function(ev){
      this.$('.edit-modal').modal('hide');
      var that = this;
      setTimeout(function(){
        that.$('.edit-modal').remove();
        $('.modal-backdrop').remove();
        $('body').removeClass( "modal-open" );
      }, 1000);
      
    },

    newItem: function(event){
      event.preventDefault();
      var itemView = new ItemView({model: new ItemModel(), mode: 'New'});
      $(this.el).append(itemView.render().el);
      itemView.show();
    },

    render:function () {
      $(this.el).html(this.template());
      $('.search-results', this.el).append(this.searchresultsView.render().el);
      return this;
    }


  });
  return ItemsView;

});