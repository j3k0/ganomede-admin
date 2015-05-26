define(function (require) {
  'use strict';

    var template = require("../text!../../templates/headerView.html");

    var HeaderView = Backbone.View.extend({

        template: _.template(template),

        events:{
            "click .logout-button":"logout"
        },

        initialize: function () {
            // this.searchResults = new EmployeeCollection();
            // this.searchresultsView = new EmployeeListView({model: this.searchResults, className: 'dropdown-menu'});
        },

        render: function () {
            $(this.el).html(this.template());
            $('.logout-button', this.el).hide();
            $('.search-group', this.el).hide();
            // $('.navbar-search', this.el).append(this.searchresultsView.render().el);
            return this;
        },

        logout: function(e){
            e.preventDefault();
            this.hideLogout();
            Backbone.history.navigate('', {trigger: true});
        },

        showLogout: function(){
            $('.logout-button', this.el).show();
            $('.search-group', this.el).show();
        },

        hideLogout: function(){
            $('.logout-button', this.el).hide();
            $('.search-group', this.el).hide();
        },

        events: {
            "keyup .search-query": "search",
            "keypress .search-query": "onkeypress"
        },

        search: function () {
            var key = $('#searchText').val();
            console.log('search ' + key);
            this.searchResults.findByName(key);
            setTimeout(function () {
                $('.dropdown').addClass('open');
            });
        },

        onkeypress: function (event) {
            if (event.keyCode == 13) {
                event.preventDefault();
            }
        },

        select: function(menuItem) {
            $('.nav li').removeClass('active');
            $('.' + menuItem).addClass('active');
        }

        });
    return HeaderView;
});