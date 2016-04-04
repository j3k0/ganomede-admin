'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var GanomedeAdminRouter = require('./router');

ReactDOM.render(
  <GanomedeAdminRouter />,
  document.getElementById('app')
);
