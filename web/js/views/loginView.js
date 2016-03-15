  'use strict';

  var fs = require('fs');
  var template = fs.readFileSync("../../templates/loginView.html");

  var LoginView = Backbone.View.extend({

    template: _.template(template),
    initialize:function (options) {
        console.log('Initializing login view');
        this.main = options.main;
    },

    events:{
        "click .login-button":"login",
        "keypress .password-input": "onkeypress"
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
        var username = this.$('.username-input').val();
        var password = this.$('.password-input').val();
        if(username === '' || password === '')
        {
            return;
        }

        this.main.login(username, password);
    }

  });
  module.exports = LoginView;
