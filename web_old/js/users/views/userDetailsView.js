  'use strict';

  var fs = require('fs');
  var template = fs.readFileSync(__dirname + "/../../../templates/userDetailsView.html", 'utf8');
var Backbone = require('backbone');

  var UserDetailsView = Backbone.View.extend({

    template: _.template(template),

    events:{
      "click .ban-button" : "ban"
    },

    initialize:function () {
      this.model.bind("change", this.render, this);
    },

    render:function () {
      $(this.el).html(this.template({user: this.model.toJSON(), location: this.model.location}));
      return this;
    },

    ban: function(ev){
      ev.preventDefault();
      var b = !($(ev.target).hasClass("banned"));
      this.model.ban(b, function(data){

      }, function(error){
        swal("Oops!", error, "error");
      });
    }

  });

  module.exports = UserDetailsView;
