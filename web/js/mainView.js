define(function (require) {
  'use strict';

  var HeaderView = require("./views/headerView");
  var MainView = Backbone.Router.extend({

    routes: {
        "": "home",
        "contact": "contact",
        "employees/:id": "employeeDetails"
    },

    initialize: function () {
        this.headerView = new HeaderView();
        $('.header').html(this.headerView.render().el);

        // Close the search dropdown on click anywhere in the UI
        $('body').click(function () {
            $('.dropdown').removeClass("open");
        });
    },

    setHeaderNavigation: function(nav){
      this.headerView.select(nav);
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
