define(function (require) {
  'use strict';

  var template = require("../../text!../../../templates/analyticsView.html");
  var tableTemplate = require("../../text!../../../templates/table.html");
  var analytics = require("../models/analytics");


  var AnalyticsView = Backbone.View.extend({

    template: _.template(template),

    events: {
      "click .filter-button": "filter",
      "click .what-button": "what"
    },

    initialize:function () {
      this.file = "checkpoints";
      this.level = 1;
    },


    filter: function(ev){
      ev.preventDefault();
      this.level = ev.target.getAttribute("data");
      this.getData();
    },

    what: function(ev){
      ev.preventDefault();
      this.file = ev.target.getAttribute("data");
      this.getData();
    },

    getData: function(){
      var that = this;
      analytics.getData(this.file, null, this.level, null, null, null, function(data){
        // that.rendercTable(data);
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

    render:function () {
      $(this.el).html(this.template());
      return this;
    }

  });
  return AnalyticsView;

});