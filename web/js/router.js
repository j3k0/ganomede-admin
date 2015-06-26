/*
This is controller of the application where we have :
- Routing between the different screens of the app
- First rendering of tabView and LodadingView
*/
define(function (require) {
    'use strict';

  var login = require("./models/login");

  var Router = Backbone.Router.extend({


     routes: {
      "": "login",
      "home": "home",
      "login": "login",
      "user/:id": "userDetails",
      "items": "items",
      "servers": "servers",
      "analytics": "analytics",
      "documentation": "documentation",
      "documentation/:id": "page",
      "logout": "logout"
    },


    initialize: function(options) {
      this.main = options.main;
    },
     
    home: function() {
        login.isLoggedIn();
        var HomeView = require("./views/homeView");
        this.renderView(new HomeView());
        this.setHeaderNavigation('home-menu');
        this.main.showLogout();
        var ajaxHandler = require("./ajaxHandler");
        var UsersCollection = require("./users/models/usersCollection");
        // UsersCollection.singleton().fetch({
        //       reset: true,                
        //       success: function(d){
        //       },
        //       error: function(m, r){
        //         ajaxHandler.errorFetchOrSave(m, r);
        //       }
        //     });
    },

    login: function() {
        var LoginView = require("./views/loginView");
        this.renderView(new LoginView({main: this.main}));
        this.main.hideLogout();
    },

    logout: function(){
      login.logout();
    },

    userDetails: function(id){
      login.isLoggedIn();
      var UserDetailsView = require("./users/views/userDetailsView");
      var UserDetailedModel = require("./users/models/userDetailedModel");
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

    items: function(){
      login.isLoggedIn();
      var ItemsView = require("./items/views/itemsView");
      var ItemsCollection = require("./items/models/itemsCollection");
      var ajaxHandler = require("./ajaxHandler");
      this.renderView(new ItemsView({collection: ItemsCollection.singleton()}));
      this.setHeaderNavigation('items-menu');
      ItemsCollection.singleton().fetch({
        reset: true,                
        success: function(d){
        },
        error: function(m, r){
          ajaxHandler.errorFetchOrSave(m, r);
        }
      });
    },

    servers: function(){
      login.isLoggedIn();
      var MonitoringView = require("./servers/views/monitoringView");
      var ServersCollection = require("./servers/models/serversCollection");
      this.renderView(new MonitoringView({collection: ServersCollection.singleton()}));
      var ajaxHandler = require("./ajaxHandler");
      this.setHeaderNavigation('servers-menu');
      ServersCollection.singleton().fetch({
        reset: true,                
        success: function(d){
        },
        error: function(m, r){
          ajaxHandler.errorFetchOrSave(m, r);
        }
      });
    },

    analytics: function(){
      login.isLoggedIn();
      var AnalyticsView = require("./analytics/views/analyticsView");
      this.renderView(new AnalyticsView({}));
      this.setHeaderNavigation('analytics-menu');
    },

    documentation: function(){
      login.isLoggedIn();
      var DocumentationView = require("./documentation/views/documentationView");
      this.renderView(new DocumentationView({}));
      this.setHeaderNavigation('documentation-menu');
    },

    page: function(id){
      login.isLoggedIn();
      var DocumentationView = require("./documentation/views/documentationView");
      this.renderView(new DocumentationView({id: id}));
      this.setHeaderNavigation('documentation-menu');
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

