'use strict';

var React = require('react');
var ReactRouter = require('react-router');
var App = require('./app.jsx');
var ItemsList = require('./items/react-wrapper');
var PacksList = require('./packs');
var LoginForm = require('./LoginForm.jsx');
var users = require('./users.jsx');
var utils = require('./utils');

var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var UsersSearch = users.Search;
var UserProfile = users.Profile;

function GanomedeRouter (/*props*/) {
  return (
    <Router history={ReactRouter.hashHistory}>
      <Route path={utils.prefixPath('/')} component={App}>
        <IndexRoute component={LoginForm} />
        <Route path={utils.prefixPath('/items')} component={ItemsList} />
        <Route path={utils.prefixPath('/packs')} component={PacksList} />
        <Route path={utils.prefixPath('/users')} component={UsersSearch}>
          <Route path={utils.prefixPath('/users/:username')} component={UserProfile} />
        </Route>
      </Route>
    </Router>
  );
}

module.exports = GanomedeRouter;
