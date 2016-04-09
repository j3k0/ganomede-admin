'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var GanomedeAdminRouter = require('./router');
var login = require('./models/login');

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
