'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var GanomedeAdminRouter = require('./router');
var login = require('./models/login');
var utils = require('./utils');

// Make jQuery() not throw when parsing empty string
// received as response to request that expects json.
$.ajaxSetup({dataFilter: function(data, type) {
  if (type === "json" && data === "") {
    data = null;
  }
  return data;
}});

// Render our App.
ReactDOM.render(
  <GanomedeAdminRouter />,
  document.getElementById('app')
);

// TODO
// pretty awkward solution…
//
// We need this to initialize our login state.
// Must be after render, so components get a chance
// to subscribe.
login.loggedIn();
