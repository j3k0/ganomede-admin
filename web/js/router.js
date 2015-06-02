/*
This is controller of the application where we have :
- Routing between the different screens of the app
- First rendering of tabView and LodadingView
*/
define(function (require) {
    'use strict';

  var Router = Backbone.Router.extend({


     routes: {
      "": "login",
      "home": "home",
      "login": "login",
      "user/:id": "userDetails"
    },

    initialize: function(options) {
      this.main = options.main;
    },
     
    home: function() {
        var HomeView = require("./views/homeView");
        this.renderView(new HomeView());
        this.setHeaderNavigation('home-menu');
        this.main.showLogout();
        var ajaxHandler = require("./ajaxHandler");
        var UsersCollection = require("./models/usersCollection");
        UsersCollection.singleton().fetch({
              reset: true,                
              success: function(d){
              },
              error: function(m, r){
                ajaxHandler.errorFetchOrSave(m, r);
              }
            });
    },

    login: function() {
        var LoginView = require("./views/loginView");
        this.renderView(new LoginView({main: this.main}));
        this.main.hideLogout();
    },

    userDetails: function(id){
      var UserDetailsView = require("./views/userDetailsView");
      var UserDetailedModel = require("./models/UserDetailedModel");
      var model = new UserDetailedModel({id: id});
      var ajaxHandler = require("./ajaxHandler");
      this.renderView(new UserDetailsView({model: model}));
      this.main.showLogout();
      model.getLocation();
      model.fetch({
            reset: true,                
            success: function(d){
            },
            error: function(m, r){
              ajaxHandler.errorFetchOrSave(m, r);
            }
          });
    },

    setHeaderNavigation: function(section) {
      this.main.setHeaderNavigation(section);
    },

    renderView: function(view) {
      this.main.renderView(view);
    }

  });

    return Router;
});

