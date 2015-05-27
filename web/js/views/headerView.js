define(function (require) {
  'use strict';

    var template = require("../text!../../templates/headerView.html");
    var UsersCollection = require("../models/usersCollection");
    var UserListView = require("./userListView");

    var HeaderView = Backbone.View.extend({

        template: _.template(template),

        events:{
            "click #logout-button":"logout"
        },

        initialize: function (options) {
          this.main = options.main;
            this.searchResults = new UsersCollection();
            this.searchresultsView = new UserListView({collection: this.searchResults, className: 'dropdown-menu'});
        },

        render: function () {
            $(this.el).html(this.template());
            $('.navbar-search', this.el).append(this.searchresultsView.render().el);
            return this;
        },
        
        showLogout: function(){
            $('.logout-button', this.el).show();
            $('.search-group', this.el).show();
        },

        hideLogout: function(){
            $('.logout-button', this.el).hide();
            $('.search-group', this.el).hide();
        },

        events: {
            "keyup .search-query": "search",
            "keypress .search-query": "onkeypress",
            "click .search-button": "search"
        },

        search: function () {
          var name = $('#searchText').val();
          // console.log('search ' + name);
          if(name === '')
          {
            $('.dropdown').removeClass('open');
              return;
          }
          this.searchResults.findByName(name);
          setTimeout(function () {
            $('.dropdown').addClass('open');
          });
        },

        onkeypress: function (event) {
            if (event.keyCode == 13) {
                event.preventDefault();
            }
        },

        select: function(menuItem) {
            $('.nav li').removeClass('active');
            $('.' + menuItem).addClass('active');
        }

        });
    return HeaderView;
});