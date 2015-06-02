define(function (require) {
  'use strict';

  var HeaderView = require("./views/headerView");
  var Login = require("./models/Login");

  var MainView = Backbone.View.extend({

    initialize: function () {
      this.headerView = new HeaderView({main: this});
      $('.header').html(this.headerView.render().el);

        // Close the search dropdown on click anywhere in the UI
        $('body').click(function () {
          $('.dropdown').removeClass("open");
        });
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
            Backbone.history.navigate('home', {trigger: true});
          }
        },
        function (resp){
          swal("Oops!", resp, "error");
        }
      );
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
      if (this.contentView) {
        this.contentView.undelegateEvents();
      }
      $("#content").html(view.render().el);
      this.contentView = view;
    },

    start: function(){
      var AppRouter = require("./router");
      this.router = new AppRouter({main: this});
      Backbone.history.start();
    }

  });
return MainView;
});
