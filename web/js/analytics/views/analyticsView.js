define(function (require) {
  'use strict';

  var template = require("../../text!../../../templates/analyticsView.html");
  var checkpointsTemplate = require("../../text!../../../templates/checkpointstable.html");
  var newPlayersTemplate = require("../../text!../../../templates/newplayerstable.html");
  var sessionsTemplate = require("../../text!../../../templates/sessionstable.html");
  var usersTemplate = require("../../text!../../../templates/userstable.html");
  var analytics = require("../models/analytics");


  var AnalyticsView = Backbone.View.extend({

    template: _.template(template),
    tableTemplate: _.template(checkpointsTemplate),

    events: {
      "click .filter-button": "filter",
      "click .what-button": "what",
      "click .app-button": "application",
      "click .version-button": "version",
      "click .group-button": "group",
      "click .cleandb-button": "cleanDb"
    },

    initialize:function () {
      this.file = "checkpoints";
      this.level = 1;
      this.app = '';
      this.ver = '';
      this.grp = '';

      var that = this;
      analytics.getApplications(function(){
        that.render();
      });

      analytics.getVersions(function(){
        that.render();
      });

      analytics.getGroups(function(){
        that.render();
      });
    },

    cleanDb: function(ev){
      ev.preventDefault();
      analytics.cleanDb();
    },

    filter: function(ev){
      this.manageFiltering(ev, ".filter-button");
      this.level = ev.target.getAttribute("data");
      this.renderTable();
    },

    what: function(ev){
      this.manageFiltering(ev, ".what-button");
      this.file = ev.target.getAttribute("data");
      switch(this.file){
        case "checkpoints":
          this.tableTemplate = _.template(checkpointsTemplate);
        break;
        case "newplayers":
          this.tableTemplate = _.template(newPlayersTemplate);
        break;
        case "sessions":
          this.tableTemplate = _.template(sessionsTemplate);
        break;
        case "users":
          this.tableTemplate = _.template(usersTemplate);
        break;
      }
      this.renderTable();
      // this.getData();
    },

    application: function(ev){
      this.manageFiltering(ev, ".app-button");
      this.app = ev.target.getAttribute("data");
      this.renderTable();
    },

    version: function(ev){
      this.manageFiltering(ev, ".version-button");
      this.ver = ev.target.getAttribute("data");
      this.renderTable();
    },

    group: function(ev){
      this.manageFiltering(ev, ".group-button");
      this.grp = ev.target.getAttribute("data");
      this.renderTable();
    },

    manageFiltering: function(ev, className){
      ev.preventDefault();
      this.removeSelected(className);
      ev.target.classList.add("btn-primary");
    },

    removeSelected: function(className){
      this.$(className).each(function(){
        if($(this).hasClass("btn-primary"))
          $(this).removeClass("btn-primary");
      });
    },

    renderTable: function(){
      this.$('.datatable').empty();
      this.$('.datatable').append(this.tableTemplate());
      var that = this;

      this.$('#table').dataTable({
        responsive: true,
        processing: true,
        serverSide: true,
        ajax: analytics.getUrl(that.file, null, that.level, that.ver, that.app, that.grp)
      });
    },

    renderApplications: function(){
      this.renderOptions('.applications-group', 'app-button', analytics.applications, 'app');
    },

    renderVersions: function(){
      this.renderOptions('.versions-group', 'version-button', analytics.applications, 'version');
    },

    renderGroups: function(){
      this.renderOptions('.groups-group', 'group-button', analytics.applications, 'grp');
    },

    renderOptions: function(className, buttonClass, arr, key){
      this.$(className).empty();
      var string = '';
      for(var index = 0,  tot = arr.length; index < tot; index++) {
        var name = arr[index][key];
        string += ("<button type='button' class='btn btn-default " + buttonClass + "' data='" + name + "'>" +
          name + "</button>");
      }
      this.$(className).append(string);
    },

    render:function () {
      $(this.el).html(this.template());
      this.renderApplications();
      this.renderVersions();
      this.renderGroups();
      return this;
    }

  });
  return AnalyticsView;

});