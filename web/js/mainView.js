define(function (require) {
  'use strict';

  var HeaderView = require("./views/headerView");
  var Login = require("./models/Login");
  var UsersCollection = require("./models/usersCollection");

  var MainView = Backbone.View.extend({

    initialize: function () {
        this.headerView = new HeaderView({main: this});
        $('.header').html(this.headerView.render().el);

        // Close the search dropdown on click anywhere in the UI
        $('body').click(function () {
            $('.dropdown').removeClass("open");
        });
    },

    searchUsers: function(name){

    },

    setHeaderNavigation: function(nav){
      this.headerView.select(nav);
    },

    // options:{
    //   url : 'etc...',
    //   data: json object to send,
    //   success: callback on success,
    //   error: callback on error
    // }
    login: function(username, password)
    {
      var that = this;
      Login.postAjax(username, password, 
        function (data){
          if(data.success === true)
          {
            that.showLogout();
            localStorage.setItem("loggedIn", true);
            UsersCollection.singleton().fetch({
                reset: true,                
                success: function(d){
                },
                error: function(e){
                    console.log(e);
                }
            });
            Backbone.history.navigate('home', {trigger: true});
          }
        },
        function (resp){

        }
      );
    },

    logout: function(){
      localStorage.setItem("loggedIn", false);
      Backbone.history.navigate('', {trigger: true});
    },

    isLoggedIn: function(){
      return localStorage.getItem("loggedIn") === 'true' ? true : false;
    },


    hideLogout: function(nav){
      this.headerView.hideLogout();
    },

    showLogout: function(nav){
      this.headerView.showLogout();
    },

    render: function() {
      return this;
    },

    renderView: function(view) {
      if(this.isLoggedIn()){
        this.showLogout();
      }
      else{
        this.hideLogout();
      }
      if (this.contentView) {
        this.contentView.undelegateEvents();
      }
      $("#content").html(view.render().el);
      this.contentView = view;
    },

    employeeDetails: function (id) {
        var employee = new Employee({id: id});
        employee.fetch({
            success: function (data) {
                // Note that we could also 'recycle' the same instance of EmployeeFullView
                // instead of creating new instances
                $('#content').html(new EmployeeView({model: data}).render().el);
            }
        });
    },

    start: function(){
        var AppRouter = require("./router");
        this.router = new AppRouter({main: this});
        Backbone.history.start();
    }
  });
  return MainView;
});
