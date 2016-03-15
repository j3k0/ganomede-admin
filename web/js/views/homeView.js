  'use strict';

  var fs = require('fs');
  var template = fs.readFileSync("../../templates/homeView.html");
  var UsersCollection = require("../users/models/usersCollection");
  var UserListView = require("../users/views/userListView");


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
    },

    onkeypress: function (event) {
      var name = $('#searchText').val();
      if (event.keyCode == 13) {
        event.preventDefault();
        if(name != '')
        {
          this.searchResults.findByName(name);
        }
      }
    },

    render:function () {
      $(this.el).html(this.template());
      $('.search-results', this.el).append(this.searchresultsView.render().el);
      return this;
    }


  });
  module.exports = HomeView;
