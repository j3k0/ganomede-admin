define(function (require) {
  'use strict';

  var template = require("../../text!../../../templates/analyticsView.html");
  var tableTemplate = require("../../text!../../../templates/table.html");
  var analytics = require("../models/analytics");


  var AnalyticsView = Backbone.View.extend({

    template: _.template(template),

    events: {
      "click .filter-button": "filter",
      "click .what-button": "what",
      "click .app-button": "application",
      "click .version-button": "version",
      "click .group-button": "group"
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

    filter: function(ev){
      this.manageFiltering(ev, ".filter-button");
      this.level = ev.target.getAttribute("data");
      this.getData();
    },

    what: function(ev){
      this.manageFiltering(ev, ".what-button");
      this.file = ev.target.getAttribute("data");
      this.getData();
    },

    application: function(ev){
      this.manageFiltering(ev, ".app-button");
      this.app = ev.target.getAttribute("data");
      this.getData();
    },

    version: function(ev){
      this.manageFiltering(ev, ".version-button");
      this.ver = ev.target.getAttribute("data");
      this.getData();
    },

    group: function(ev){
      this.manageFiltering(ev, ".group-button");
      this.grp = ev.target.getAttribute("data");
      this.getData();
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
    
    getData: function(){
      var that = this;
      analytics.getData(this.file, null, this.level, this.ver, this.app, this.grp, function(data){
        that.renderTable(data);
      });
    },

    renderTable: function(data){
      if(!data || data.length === 0){
        this.$('.datatable').empty();
        this.$('.datatable').append("<h4>No data available!</h4>");
        return;
      }
      this.$('.datatable').empty();
      this.$('.datatable').append(_.template(tableTemplate)());
      var string;
      string = "<tr>";
      for(var i in data[0]){
        string += ("<th>" + i + "</th>");
      }
      string += "</tr>";
      this.$('.table-head').append(string);
      this.$('.table-foot').append(string);
      for (var index = 0,  tot = data.length; index < tot; index++) {
        var item = data[index];
        string = "<tr>";
        for(var key in data[0]){
          string += ("<td>" + item[key] + "</td>");
        }
        string += "</tr>";
        this.$('.table-body').append(string);
      }
      this.$('#table').dataTable({responsive: true});
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