define(function (require) {
  'use strict';

  var template = require("../../text!../../../templates/analyticsView.html");
  var checkpointsTemplate = require("../../text!../../../templates/checkpoints.html");
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
        that.renderTable(data);
      });
    },

    renderTable: function(data){
      this.$('.datatable').empty();
      this.$('.datatable').append(_.template(checkpointsTemplate)());
      // table-body
      var string;
      for (var i = 0,  tot = data.length; i < tot; i++) {
        var item = data[i];
        string = "<tr>";
        string += ("<td>" + item.Date + "</td>");
        string += ("<td>" + item.App + "</td>");
        string += ("<td>" + item.Version + "</td>");
        string += ("<td>" + item.Grp + "</td>");
        string += ("<td>" + item.Device + "</td>");
        string += ("<td>" + item.UDID + "</td>");
        string += ("<td>" + item.Session + "</td>");
        string += ("<td>" + item.Name + "</td>");
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