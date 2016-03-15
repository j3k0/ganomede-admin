  'use strict';

  var fs = require('fs');
  var template = fs.readFileSync(__dirname + "/../../../templates/modal.html", 'utf8');
  var ItemModel = require("../models/itemModel");
  var ajaxHandler = require("../../ajaxHandler");

  var ItemView = Backbone.View.extend({

    template: _.template(template),

    events: {
      "click .close-button": "closeModal",
      "click .save-button": "saveItem"
    },

    initialize:function (options) {
      this.mode = options.mode;
      this.collection = options.collection;
    },


    closeModal: function(ev){
      this.$('.edit-modal').modal('hide');
      var that = this;
      setTimeout(function(){
        that.$('.edit-modal').remove();
        $('.modal-backdrop').remove();
        $('body').removeClass( "modal-open" );
      }, 1000);
    },

    show: function(){
      this.$('.edit-modal').modal('toggle');
      this.$('.edit-modal').modal('show');
      this.$('.modal-title').html(this.mode + " item");
    },

    hideError: function(options){
      if(!this.$('.title-error').hasClass('hidden')){
        this.$('.title-error').addClass('hidden');
      }
      if(!this.$('.id-error').hasClass('hidden')){
        this.$('.id-error').addClass('hidden');
      }
      if(!this.$('.description-error').hasClass('hidden')){
        this.$('.description-error').addClass('hidden');
      }
      if(!this.$('.price-error').hasClass('hidden')){
        this.$('.price-error').addClass('hidden');
      }
    },

    saveItem: function(ev){
      var title = this.$('.title-input').val();
      var id = this.$('.id-input').val();
      var description = this.$('.description-input').val();
      var price = this.$('.price-input').val();
      var currency = this.$('.currency-input').val();
      var error = false;
      var that = this;
      this.hideError();

      if(id === ''){
        this.$('.id-error').removeClass('hidden');
        error = true;
      }
      if(title === ''){
        this.$('.title-error').removeClass('hidden');
        error = true;
      }
      if(description === '')
      {
        this.$('.description-error').removeClass('hidden');
        error = true;
      }
      if(price === '')
      {
        this.$('.price-error').removeClass('hidden');
        error = true;
      }

      if(error){
        return;
      }
      this.model.save({
        id: id,
        title: title,
        description: description,
        price: price,
        currency: currency
      }, {
        success: function (model, response) {
          if(response.id || response.success){
            swal("Success", "Item saved", "success");
            if (that.collection){
              that.collection.add(that.model);
            }
          }
        },
        error: function (model, er) {
          ajaxHandler.errorFetchOrSave(model, er);
        }
      });

      this.closeModal();
    },

    render:function () {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    }


  });
  module.exports = ItemView;
