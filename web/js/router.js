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
      "user/:id": "userDetails",
      "items": "items",
      "servers": "servers",
      "analytics": "analytics",
      "documentation": "documentation"
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

    userDetails: function(id){
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
      var AnalyticsView = require("./analytics/views/analyticsView");
      this.renderView(new AnalyticsView({}));
      this.setHeaderNavigation('analytics-menu');
    },

    documentation: function(){
      var DocumentationView = require("./documentation/views/documentationView");
      this.renderView(new DocumentationView({}));
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

