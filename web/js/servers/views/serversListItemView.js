define(function (require) {
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
    createGauge: function(element, title){
      var opts = {
        lines: 100, // The number of lines to draw
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
      var gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
      gauge.maxValue = 100; // set max gauge value
      gauge.animationSpeed = 128; // set animation speed (32 is default value)
      gauge.setTextField(this.$(element + '-text-field')[0]);
      gauge.set(20); // set actual value
      setInterval(function(){
       gauge.set(Math.random() * (100));
      }, 3000);
    },

    initializeGauges: function(){
      var that = this;
      var elements = ['.container_cpu', '.container_memory',
      '.service_cpu', '.service_memory', '.host_cpu',
      '.host_memory', '.host_disk' ];
      var titles = ['Container CPU', 'Container Memory', 'Service CPU',
      'Service Memory', 'Host CPU', 'Host Memory', 'Host Disk'];
      for(var i =0; i < elements.length; i++){
        this.createGauge(elements[i], titles[i]);
      }
     
      
    },

    render:function () {
      $(this.el).html(this.template(this.model.toJSON()));
      this.initializeGauges();
      return this;
    }

  });
  return ServersListItemView;

});