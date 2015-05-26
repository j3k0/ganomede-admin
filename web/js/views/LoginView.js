define(function (require) {
  'use strict';

  var template = require("../text!../../templates/loginView.html");
  var LoginView = Backbone.View.extend({

    template: _.template(template),
    initialize:function (options) {
        console.log('Initializing login view');
        this.main = options.main;
//        this.template = _.template(directory.utils.templateLoader.get('home'));
//        this.template = templates['Home'];
    },

    events:{
        "click .login-button":"login"
    },

    render:function () {
        $(this.el).html(this.template());
        return this;
    },

    login:function () {

        this.main.showLogout();
    }

});
return LoginView;
});