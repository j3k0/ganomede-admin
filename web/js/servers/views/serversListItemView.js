  'use strict';

  var template = require("../../text!../../../templates/serversListItemView.html");
  var ajaxHandler = require("../../ajaxHandler");

  var ServersListItemView = Backbone.View.extend({


    tagName:"a",
    className: "list-group-item",
    template: _.template(template),

    initialize:function () {
      this.model.bind("change", this.render, this);
      this.model.bind("destroy", this.close, this);
    },

    events: {
    },
    createGauge: function(element, title, width){
      var opts = {
        lines: 12, // The number of lines to draw
        length: 0.02,
        angle: 0.00, // The length of each line
        lineWidth: 0.03, // The line thickness
        title: title,
        pointer: {
          length: 0.6, // The radius of the inner circle
          strokeWidth: 0.035, // The rotation offset
          color: '#000000' // Fill color
        },
        colorStart: '#6FADCF',   // Colors
        colorStop: '#8FC0DA',    // just experiment with them
        strokeColor: '#E0E0E0',   // to see which ones work best for you
        generateGradient: true
      };
      var target = this.$(element)[0]; // your canvas element
      target.width = width;
      target.height = width / 2;
      var gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
      if(title === "Ping"){
        gauge.maxValue = 30; // set max gauge value
        gauge.set(this.model.get('pingMs'));
      }else{
        gauge.maxValue = 100; // set max gauge value
        var val = Math.random() * (100);
        var color = (val < 50) ? "#3E8427" : (val < 75)? "#FCD009" : "#FF0000";
        opts.colorStop = color;
        gauge.setOptions(opts);
        gauge.set(val); // set actual value
      }
      gauge.animationSpeed = 128; // set animation speed (32 is default value)
      gauge.setTextField(this.$(element + '-text-field')[0]);
    },

    initializeGauges: function(){
      var that = this;
      var width = 100;
      this.$('.footer-row').css({"width": width + "px", "margin-left": "-7px"});
      var elements = ['.ping_server', '.container_cpu', '.container_memory',
      '.service_cpu', '.service_memory', '.host_cpu',
      '.host_memory', '.host_disk' ];
      var titles = ['Ping', 'Container CPU', 'Container Memory', 'Service CPU',
      'Service Memory', 'Host CPU', 'Host Memory', 'Host Disk'];
      for(var i =0; i < elements.length; i++){
        this.createGauge(elements[i], titles[i], width);
      }


    },

    render:function () {
      $(this.el).html(this.template(this.model.toJSON()));
      this.initializeGauges();
      return this;
    }

  });
  module.exports = ServersListItemView;
