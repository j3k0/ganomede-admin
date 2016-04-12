'use strict';

var React = require('react');
var ReactRouter = require('react-router');
var login = require('./models/login');

function NavLink (props) {
  return (
    <ReactRouter.Link {...props} activeClassName='active' />
  );
};

function Header (props) {
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
          <a className="navbar-brand" href="#">Triominos administration</a>
        </div>

        <div className="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
          <ul className="nav navbar-nav">
            <li className="items-menu">
              <NavLink to='/items'>Items</NavLink>
            </li>
            <li>
              <NavLink to='/packs'>Packs</NavLink>
            </li>
          </ul>

          { (function () {
              if (!props.loggedIn)
                return;

              return (
                <ul id="logout-ul" className="nav navbar-nav navbar-right">
                  <li>
                    <a onClick={props.onLogout} className="logout-button">Logout</a>
                  </li>
                </ul>
              );
            }())
          }
        </div>
      </div>
    </nav>
  );
};

var App = React.createClass({
  // Get access to react router instance via
  // this.context.router
  contextTypes: {
    router: React.PropTypes.object
  },

  getInitialState: function () {
    return {
      loggedIn: false
    };
  },

  onLoggedInChanged: function (model, newLoggedIn) {
    if (newLoggedIn === false)
      this.context.router.push('/');

    this.setState({loggedIn: newLoggedIn});
  },

  componentDidMount: function () {
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
      <div>
        <div className="header">
          <Header loggedIn={this.state.loggedIn}
                  onLogout={this.onLogout}
          />
        </div>

        <div className="container">
          <div className="row">
            <div id='content' className="span12">
              {this.props.children}
            </div>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = App;
