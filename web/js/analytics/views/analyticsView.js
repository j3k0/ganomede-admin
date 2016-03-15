  'use strict';

  var template = require("../../text!../../../templates/analyticsView.html");
  var checkpointsTemplate = require("../../text!../../../templates/checkpointstable.html");
  var newPlayersTemplate = require("../../text!../../../templates/newplayerstable.html");
  var sessionsTemplate = require("../../text!../../../templates/sessionstable.html");
  var usersTemplate = require("../../text!../../../templates/userstable.html");
  var analytics = require("../models/analytics");
  var ServicesCollection = require("../../models/servicesCollection");


  var AnalyticsView = Backbone.View.extend({

    template: _.template(template),
    tableTemplate: _.template(checkpointsTemplate),

    events: {
      "click .filter-button": "filter",
      "click .what-button": "what",
      "click .app-button": "application",
      "click .version-button": "version",
      "click .group-button": "group",
      "click .cleandb-button": "cleanDb",
      "click .show-chart-button": 'showHideChart'
    },

    initialize:function () {
      this.file = "checkpoints";
      this.level = undefined;
      this.app = '';
      this.ver = '';
      this.grp = '';

      this.chartsData = {
          labels: [],
          dataSet: []
      };

      var that = this;
      analytics.getApplications(function(){
        that.renderApplications();
      });

      analytics.getVersions(function(){
        that.renderVersions();
      });

      analytics.getGroups(function(){
        that.renderGroups();
      });

      this.servicesCollection = ServicesCollection.singleton("analytics");
      this.servicesCollection.bind("reset change remove", this.renderPanel, this);

    },

    cleanDb: function(ev){
      ev.preventDefault();
      analytics.cleanDb();
    },

    filter: function(ev){
      this.level = ev.target.getAttribute("data");
      this.manageFiltering(ev, ".filter-button");
    },

    what: function(ev){
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
      this.manageFiltering(ev, ".what-button");
    },

    application: function(ev){
      this.app = ev.target.getAttribute("data");
      this.manageFiltering(ev, ".app-button");
    },

    version: function(ev){
      this.ver = ev.target.getAttribute("data");
      this.manageFiltering(ev, ".version-button");
    },

    group: function(ev){
      this.grp = ev.target.getAttribute("data");
      this.manageFiltering(ev, ".group-button");
    },

    manageFiltering: function(ev, className){
      ev.preventDefault();
      this.removeSelected(className);
      ev.target.classList.add("btn-primary");
      this.renderTable();
      this.getChartData();
    },

    removeSelected: function(className){
      this.$(className).each(function(){
        if($(this).hasClass("btn-primary"))
          $(this).removeClass("btn-primary");
      });
    },

    getChartData: function(){
      var that = this;
      analytics.getData(this.file, 1, null, this.level, this.ver, this.app, this.grp, function(d){
        that.chartsData = {
          labels: [],
          dataSet: []
        };
        for (var key in d) {
          if (d.hasOwnProperty(key)) {
            that.chartsData.labels.unshift(key);
            that.chartsData.dataSet.unshift(d[key]);
          }
        }
        var maxPoints = 6;
        if(that.chartsData.labels.length > maxPoints){
          that.chartsData.labels = that.chartsData.labels.slice(- maxPoints);
          that.chartsData.dataSet = that.chartsData.dataSet.slice(- maxPoints);
        }
        if(that.$('.show-chart-button').hasClass('on'))
          that.renderChart(that.chartsData);
      });
    },

    showHideChart: function(ev){
      var btn = $(ev.target);
      if(btn.hasClass('off')){
        btn.removeClass("off");
        btn.addClass("on");
        this.renderChart(this.chartsData);
        btn.html("Hide Chart");
      }else{
        btn.removeClass("on");
        btn.addClass("off");
        btn.html("Show Chart");
        this.removeChart();
      }
    },

    removeChart: function(){
      this.$('.chart').empty();
      if(this.myLineChart){
        this.myLineChart.destroy();
      }
    },

    renderChart: function(d){
      this.removeChart();
      if(d.labels.length == 0 ){
        return;
      }
      this.$('.chart').append("<canvas id=\"myChart\" width=\"200\" height=\"200\" ></canvas>");
      var ctx = this.$('#myChart')[0].getContext("2d");
      var data = {
          labels: d.labels,
          datasets: [
              {
                  label: "My Second dataset",
                  fillColor: "rgba(151,187,205,0.2)",
                  strokeColor: "rgba(151,187,205,1)",
                  pointColor: "rgba(151,187,205,1)",
                  pointStrokeColor: "#fff",
                  pointHighlightFill: "#fff",
                  pointHighlightStroke: "rgba(151,187,205,1)",
                  data: d.dataSet
              }
          ]
      };

      this.myLineChart = new Chart(ctx).Line(data, {
          scaleShowGridLines : true,
          scaleGridLineColor : "rgba(0,0,0,.05)",//String - Colour of the grid lines
          scaleGridLineWidth : 1,//Number - Width of the grid lines
          scaleShowHorizontalLines: true,//Boolean - Whether to show horizontal lines (except X axis)
          scaleShowVerticalLines: true,//Boolean - Whether to show vertical lines (except Y axis)
          bezierCurve : true,//Boolean - Whether the line is curved between points
          bezierCurveTension : 0.4,//Number - Tension of the bezier curve between points
          pointDot : true,//Boolean - Whether to show a dot for each point
          pointDotRadius : 2,//Number - Radius of each point dot in pixels
          pointDotStrokeWidth : 1,//Number - Pixel width of point dot stroke
          pointHitDetectionRadius : 20,//Number - amount extra to add to the radius to cater for hit detection outside the drawn point
          datasetStroke : true,//Boolean - Whether to show a stroke for datasets
          datasetStrokeWidth : 2,//Number - Pixel width of dataset stroke
          datasetFill : true,//Boolean - Whether to fill the dataset with a colour
          responsive: true,
          //String - A legend template
          legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].strokeColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"

      });
    },

    renderTable: function(){
      this.$('.datatable').empty();
      this.$('.datatable').html(this.tableTemplate());
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
      this.renderOptions('.versions-group', 'version-button', analytics.versions, 'version');
    },

    renderGroups: function(){
      this.renderOptions('.groups-group', 'group-button', analytics.groups, 'grp');
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

     renderPanel: function(){
      this.$('.panel-data').remove();
       _.each(this.servicesCollection.models, function (item) {
          this.$('.services-panel').append("<div class=\"panel-body panel-data\"><a target=\"_blank\" href=" + item.get('url') + ">" + item.get('name') + "</a></div>");
        }, this);
    },

    render:function () {
      $(this.el).html(this.template());
      this.renderApplications();
      this.renderVersions();
      this.renderGroups();
      this.renderPanel();
      this.renderTable();
      this.getChartData();
      return this;
    }

  });
  module.exports = AnalyticsView;
