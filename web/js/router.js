'use strict';

var React = require('react');
var ReactRouter = require('react-router');
var App = require('./app');
var ItemsList = require('./items/react-wrapper');

var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var hashHistory = ReactRouter.hashHistory;

function Welcome (props) {
  return (
    <h3>hi! this is index route</h3>
  );
};

module.exports = function router (/*props*/) {
  return (
    <Router history={hashHistory}>
      <Route path="/" component={App}>
        <IndexRoute component={Welcome} />
        <Route path="/items" component={ItemsList} />
      </Route>
    </Router>
  );
};
