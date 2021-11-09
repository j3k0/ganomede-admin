'use strict';

var React = require('react');
var ReactRouter = require('react-router');
var App = require('./app.jsx');
var ItemsList = require('./items/react-wrapper');
var PacksList = require('./packs');
var LoginForm = require('./LoginForm.jsx');
var users = require('./users.jsx');
var DataLayout = require('./data.jsx');
var utils = require('./utils');
var {Link} = require('./components/Links.jsx');
var Debug = require('./components/Debug.jsx');
var {ChatRoom} = require('./chatRoom.jsx');

var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var IndexRoute = ReactRouter.IndexRoute;
var UsersSearch = users.Search;
var UserProfile = users.Profile;

function GanomedeRouter () {
  const {services} = window.REACT_INITIAL_STATE;

  return (
    <Router history={ReactRouter.browserHistory}>
      <Route path={utils.webPath('/')} component={App} >
        <IndexRoute component={LoginForm} />
        <Route path={utils.webPath('/items')} component={ItemsList} />
        <Route path={utils.webPath('/packs')} component={PacksList} />
        <Route path={utils.webPath('/users')} component={UsersSearch}>
          <Route path={utils.webPath('/users/:username')} component={UserProfile} />
        </Route>

        {
          services.includes('data') && (
            <Route path={utils.webPath('/data')} component={DataLayout}>
              <Route path={utils.webPath('/data/:docId')} component={DataLayout} />
            </Route>
          )
        }
        <Route path={utils.webPath('/chat')} component={ChatRoom} />
      </Route>

      <Route path="*" component={(props) => (
        <div className="container">
          <h3>Page Not Found</h3>

          <div>
            <Link to="/">Home Page</Link>
          </div>

          <div>
            <h4>React Initial State</h4>
            Perhaps env var for a service is missing.
            <Debug.pre data={window.REACT_INITIAL_STATE} />
          </div>

          <div>
            <h4>Routing Info</h4>
            <Debug.pre data={props} />
          </div>
        </div>
      )}/>
    </Router>
  );
}

module.exports = GanomedeRouter;
