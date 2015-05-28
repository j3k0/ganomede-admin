define(function (require) {
  'use strict';

  var template = require("../text!../../templates/homeView.html");
  var UsersCollection = require("../models/usersCollection");
  var UserListView = require("./userListView");


  var HomeView = Backbone.View.extend({

    template: _.template(template),

    events: {
      "keyup .search-query": "search",
      "keypress .search-query": "onkeypress"
    },

    initialize:function () {
      console.log('Initializing Home View');
      this.searchResults = new UsersCollection();
      this.searchresultsView = new UserListView({collection: this.searchResults, className: 'list-group'});
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
      }
    },

    render:function () {
      $(this.el).html(this.template());
      $('.search-results', this.el).append(this.searchresultsView.render().el);
      return this;
    }


  });
  return HomeView;

});