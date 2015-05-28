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
      "logout": "logout",
      "user/:id": "userDetails"
    },

    initialize: function(options) {
      this.main = options.main;
    },
     
    home: function() {
      if(this.main.isLoggedIn()){
        var HomeView = require("./views/homeView");
        this.renderView(new HomeView());
        this.setHeaderNavigation('home-menu');
      }else{
        Backbone.history.navigate('login', {trigger: true});
      }
    },

    login: function() {
      if(!this.main.isLoggedIn()){
        var LoginView = require("./views/loginView");
        this.renderView(new LoginView({main: this.main}));
      }
      else{
        Backbone.history.navigate('home', {trigger: true});
      }
    },

    userDetails: function(id){
      if(this.main.isLoggedIn()){
        var UserDetailsView = require("./views/userDetailsView");
        var UserDetailedModel = require("./models/UserDetailedModel");
        var model = new UserDetailedModel({id: id});
        this.renderView(new UserDetailsView({model: model}));
        model.getLocation();
        model.fetch({
              reset: true,                
              success: function(d){
              },
              error: function(e){
                console.log(e);
              }
            });
      }
      else{
        Backbone.history.navigate('home', {trigger: true});
      }
    },

    logout: function(){
      this.main.logout();
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

