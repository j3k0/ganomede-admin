  'use strict';

  var fs = require('fs');
  var template = fs.readFileSync(__dirname + "/../../../templates/documentationView.html", 'utf8');

  var documentation = require("../models/documentation");
  var ajaxHandler = require("../../ajaxHandler");
  var Backbone = require('backbone');

  var DocumentationView = Backbone.View.extend({

    template: _.template(template),

    events: {
      'click a[href^="/"]:not(.page-anchor)': "clickLink",
      'click .upload-button': "upload",
      'click .page-anchor': 'page',
      'click .home-anchor': 'home'
    },

    initialize:function (options) {
      var that = this;
      var id = options.id;
      var url = !id ? null : '../cms/posts/' + id;
      documentation.getData(url, function(data){
        that.renderHtml(data);
      });
    },

    upload: function(e){
      console.log("upload");
      e.preventDefault();
      var file = this.$('.file-input').val();
      if(file=='')
      {
        swal('Oops!', 'Please choose a file', 'error');
      }else{
        var form = this.$('.file-form');
        var formData = new FormData(form[0]);
        var that = this;
        console.log(formData);
        ajaxHandler.postAjax({
          url: form.attr("action"),
          type: 'POST',
          data: formData,
          success: function (data) {
              that.renderHtml(data);
          },
          cache: false,
          contentType: false,
          processData: false
        });
      }
    },

    page: function(ev){
      ev.preventDefault();
      var url = ev.target.href;
      var attachId = url.substring(url.lastIndexOf('/') + 1);
      Backbone.history.navigate('documentation/' + attachId, {trigger: true});
    },

    home: function(ev){
      Backbone.history.navigate('documentation', {trigger: true});
    },

    clickLink: function(ev){
      ev.preventDefault();
      var that = this;
      var url = ev.target.href;
      var doIt = function(){
        documentation.getData(url, function(data){
          that.renderHtml(data);
        });
      };
      if(url && url.includes("delete")){
        swal({
            title: "Are you sure?",
            text: "You will not be able to recover this item!",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, delete it!",
            closeOnConfirm: true
          },
          function(){
            doIt();
          }
        );
      }else{
        doIt();
      }

    },

    renderHtml: function(data){
      this.$('.documentation-content').html(data);
      this.handleForm();
    },

    handleForm: function(){
       // this is the id of the form
      var that = this;
      this.$("#form-post").submit(
        function(e) {
          e.preventDefault();
          var inputsEmpty = false;
          that.$('input[type=text]').each(function() {
            var input = $(this);
            if(input.val() === ''){
              inputsEmpty = true;
            }
          });
          that.$('textarea').each(function() {
            var textarea = $(this);
            if(textarea.val() === ''){
              inputsEmpty = true;
            }
          });
          if(!inputsEmpty){
            var url = $(this).attr('action'); // the script where you handle the form input.
            $.ajax({
                 type: "POST",
                 url: url,
                 data: $(this).serialize(), // serializes the form's elements.
                 success: function(data)
                 {
                     that.renderHtml(data);
                 }
            });
          }else{
            swal('Oops!', 'Some fields are empty!', 'error');
          }

          return false; // avoid to execute the actual submit of the form.
      });
    },


    render: function () {
      $(this.el).html(this.template());
      return this;
    }

  });
  module.exports = DocumentationView;
