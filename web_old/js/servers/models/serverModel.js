  'use strict';


  var Backbone = require('backbone');

  var ServerModel = Backbone.Model.extend({

    idAttribute: 'id',

    defaults: {
      alive: false,
      type: '',
      version: '',
      config: {},
      host: '',
      port: 8000,
      pingMs: 5,
      container_cpu: 0,
      container_memory: 0,
      service_cpu: 0,
      service_memory: 0,
      host_cpu: 0,
      host_memory: 0,
      host_disk: 0
    },

    initialize:function () {
    }

  });

  module.exports = ServerModel;
