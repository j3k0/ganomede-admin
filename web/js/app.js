'use strict';

var React = require('react');
var ReactRouter = require('react-router');
var utils = require('./utils');

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
          </ul>

          <ul id="logout-ul" className="nav navbar-nav navbar-right">
            <li>
              <a className="logout-button" href="#logout">Logout</a>
            </li>
          </ul>

        </div>
      </div>
    </nav>
  );
};

var App = React.createClass({
  getInitialState: function () {
    return {
      loggedIn: false
    };
  },

  componentDidMount: function () {
    utils.allowEmptyAjaxResponse();
  },

  render: function () {
    return (
      <div>
        <div className="header">
          <Header />
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
