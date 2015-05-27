define(function (require) {
  'use strict';

  var template = require("../text!../../templates/loginView.html");
  var config = require("../config.js");

  var LoginView = Backbone.View.extend({

    template: _.template(template),
    initialize:function (options) {
        console.log('Initializing login view');
        this.main = options.main;
    },

    events:{
        "click .login-button":"login",
        "keypress #password-input": "onkeypress"
    },

    render:function () {
        $(this.el).html(this.template());
        return this;
    },

    onkeypress: function (event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            this.login();
        }
    },

    login:function (ev) {
        var username = $('#username-input').val();
        var password = $('#password-input').val();
        if(username === '' || password === '')
        {
            return;
        }

        this.main.login(username, password);
    }

});
return LoginView;
});