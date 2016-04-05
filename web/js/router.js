'use strict';

var React = require('react');
var ReactRouter = require('react-router');
var App = require('./app');
var ItemsList = require('./items/react-wrapper');
var LoginForm = require('./LoginForm.jsx');

var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var hashHistory = ReactRouter.hashHistory;

module.exports = function GanomedeRouter (/*props*/) {
  return (
    <Router history={hashHistory}>
      <Route path="/" component={App}>
        <IndexRoute component={LoginForm} />
        <Route path="/items" component={ItemsList} />
      </Route>
    </Router>
  );
};
