

define(function (require) {
  'use strict';

  var ajaxHandler = require("../../ajaxHandler");

  var Analytics = {
    data: {},
    applications: [],
    versions: [],
    groups: [],

    getOptions: function (url, arr, callback){
      if(arr.length != 0)
      {
        if (callback) callback(arr);
        return;
      }
      ajaxHandler.postAjax({
        url: "../checkpoints/v1/" + url,
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (d){
          if(typeof d === "string")
          {
            d = JSON.parse(d);
          }
          if (callback) callback(d);
        },
        error: function (resp){
          console.log(resp);
        }
      });
    },

    getApplications: function(callback){
      var that = this;
      this.getOptions("applications", this.applications, function(d){
        that.applications = d;
        if (callback) callback(d);
      });
    },

    getVersions: function(callback){
      var that = this;
      this.getOptions("versions", this.versions, function(d){
        that.versions = d;
        if (callback) callback(d);
      });
    },

    getGroups: function(callback){
      var that = this;
      this.getOptions("groups", this.groups, function(d){
        that.groups = d;
        if (callback) callback(d);
      });
    },


    getData: function(file, udid, user_level, ver, app, grp, callback){
      udid = udid ? udid : '';
      ver = ver ? ver : '';
      app = app ? app : '';
      grp = grp ? grp : '';
      var that = this;
      var key = file + "-" + user_level + "-" + ver + "-" + app + "-" + grp;
      if(this.data[key]){
        if (callback) callback(this.data[key]);
        return;
      }

      ajaxHandler.postAjax({
        url: "../checkpoints/v1/" + file + "?UDID=" + udid + "&userlevel=" + user_level +
        "&ver=" + ver + "&app=" + app + "&grp=" + grp,
        type: 'GET',
        contentType: "application/json; charset=utf-8",
        success: function (d){
          if(typeof d === "string")
          {
            d = JSON.parse(d);
          }
          that.data[key] = d;
          if (callback) callback(d);
        },
        error: function (resp){
          console.log(resp);
        }
      });
    }

  };

  return Analytics;
});

