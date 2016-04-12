  'use strict';
  var Backbone = require('backbone');
    var fs = require('fs');
    var template = fs.readFileSync(__dirname + "/../../templates/headerView.html", 'utf8');

    var HeaderView = Backbone.View.extend({

      template: _.template(template),

      initialize: function (options) {
        this.main = options.main;
      },

      render: function () {
          $(this.el).html(this.template());
          return this;
      },

      showLogout: function(){
          $('.logout-button', this.el).show();
      },

      hideLogout: function(){
          $('.logout-button', this.el).hide();
      },

      select: function(menuItem) {
          $('.nav li').removeClass('active');
          $('.' + menuItem).addClass('active');
      }

    });
    module.exports = HeaderView;