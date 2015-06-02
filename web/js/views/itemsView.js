define(function (require) {
  'use strict';

  var template = require("../text!../../templates/itemsView.html");
  var ItemsCollection = require("../models/itemsCollection");
  var ItemsListView = require("./itemsListView");


  var ItemsView = Backbone.View.extend({

    template: _.template(template),

    events: {
      "click .search-button": "search",
      "keypress .search-query": "onkeypress"
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

    render:function () {
      $(this.el).html(this.template());
      $('.search-results', this.el).append(this.searchresultsView.render().el);
      return this;
    }


  });
  return ItemsView;

});