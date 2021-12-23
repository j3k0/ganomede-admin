'use strict';

var React = require('react');
var Loader = require('./components/Loader.jsx');
var login = require('./models/login');
var utils = require('./utils');
var {Link, NavLink} = require('./components/Links.jsx');

function Header ({loggedIn, onLogout}) {
  const {services, branding} = window.REACT_INITIAL_STATE;

  var menuLinks = [
    <NavLink key={0} to='/items'>Items</NavLink>,
    <NavLink key={1} to='/packs'>Packs</NavLink>,
    <NavLink key={2} to='/users'>Users</NavLink>,
    <NavLink key={3} to='/chat'>Chat</NavLink>,
    <NavLink key={5} to='/reported'>Reported Users</NavLink>,
    services.includes('data') && <NavLink key={4} to='/data'>Data</NavLink>
  ];

  return (
    <nav className="navbar navbar-default">
      <div className="container-fluid">
        <div className="navbar-header">
          <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
            <span className="sr-only">Toggle navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
          </button>
          <Link className="navbar-brand" to="/">{branding.title} Administration</Link>
        </div>

        <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
          <ul className="nav navbar-nav">
            {menuLinks}
          </ul>

          { (function () {
            if (!loggedIn)
              return;

            return (
              <ul id="logout-ul" className="nav navbar-nav navbar-right">
                <li>
                  <a onClick={onLogout} className="logout-button">Logout</a>
                </li>
              </ul>
            );
          }())
          }
        </div>
      </div>
    </nav>
  );
}

var App = React.createClass({
  // Get access to react router instance via
  // this.context.router
  contextTypes: {
    router: React.PropTypes.object
  },

  // Pass in stuff to children.
  childContextTypes: {
    currencies: React.PropTypes.arrayOf(React.PropTypes.string)
  },

  getChildContext: function () {
    return {currencies: this.state.currencies};
  },

  getInitialState: function () {
    return {
      loggedIn: false,
      loading: true,
      error: false,
      currencies: []
    };
  },

  onLoggedInChanged: function (model, newLoggedIn) {
    if (newLoggedIn === false)
      this.context.router.push(utils.webPath('/'));

    this.setState({loggedIn: newLoggedIn});
  },

  componentWillMount: function () {
    require('./items/models/itemsCollection').singleton().fetch({
      success: function (collection) {
        this.setState({
          loading: false,
          currencies: collection.currencies
        });
      }.bind(this),
      error: function (collection, xhr) {
        var err = new Error(xhr.responseText);
        err.reason = xhr.responseJSON;
        this.setState({
          loading: false,
          // TODO
          // this is a temporary workaround, since currencies is
          // protected by auth, we need not to "throw" so user sees login form.
          error: xhr.status === 401 ? null : err
        });
      }.bind(this)
    });
    login.sub(this.onLoggedInChanged);
  },

  componentWillUnmount: function () {
    login.unsub(this.onLoggedInChanged);
  },

  onLogout: function () {
    login.logout();
  },

  render: function () {
    return (
      <div className="App">
        <div className="Header header">
          <Header loggedIn={this.state.loggedIn}
            onLogout={this.onLogout}
          />
        </div>

        <div className="content-wrapper">
          <div className="content container">
            <div className="row">
              <div id='content' className="span12">
                <Loader loading={this.state.loading} error={this.state.error}>
                  {this.props.children}
                </Loader>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = App;
