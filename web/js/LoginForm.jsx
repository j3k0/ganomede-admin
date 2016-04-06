'use strict';

var React = require('react');
var login = require('./models/login');
var Loader = require('./components/Loader.jsx');

var Form = React.createClass({
  getInitialState: function () {
    return {error: null};
  },

  onSubmit: function () {
    login.login({
      username: this.refs.username.value,
      password: this.refs.password.value
    }, function (err, success) {
      if (err) {
        return this.setState({
          error: String(error)
        });
      }

      if (!success) {
        return this.setState({
          error: 'Invalid username or password.'
        });
      }

      this.props.onSuccess();
    }.bind(this));
  },

  render: function () {
    return (
      <div className="row">
        <div className="col-md-6">
          <img src="img/logo.png" alt="" width="200" height="150" />
        </div>

        <div className="col-md-6">
          <form className="pull-right"
                onSubmit={this.onSubmit}
          >
            <h3>Login</h3>
            <br/>

            <div className="input-group">
              <span className="input-group-addon" id="username-span">Username</span>
              <input type="text" id="username-input" className="form-control username-input"
                     placeholder="Username" aria-describedby="username-span" required
                     ref='username'
              />
            </div>
            <br/>

            <div className="input-group">
              <span className="input-group-addon" id="password-span">Password</span>
              <input id="password-input" type="password" className="form-control password-input"
                     placeholder="Password" aria-describedby="password-span" required
                     ref='password'
              />
            </div>
            <br/>

            { this.state.error
                ? <div>{this.state.error}</div>
                : undefined
            }
            <br/>

            <input className="btn btn-primary btn-large login-button"
                   type="submit"
                   value="Login &raquo;"
            />
          </form>
          </div>
      </div>
    );
  }
});

function Welcome (props) {
  return (<h2>Welcome to Triominos administration!</h2>);
};

var LoginForm = React.createClass({
  getInitialState: function () {
    return {
      error: null,
      loading: true,
      loggedIn: false
    };
  },

  onLoggedInChanged: function (model, newLoggedIn) {
    this.setState({loggedIn: newLoggedIn});
  },

  componentDidMount: function () {
    login.loggedIn(function (err, loggedIn) {
      if (!err)
        login.sub(this.onLoggedInChanged);

      this.setState({
        error: err,
        loading: false,
        loggedIn: loggedIn
      });
    }.bind(this));
  },

  componentWillUnmount: function () {
    login.unsub(this.onLoggedInChanged);
  },

  render: function () {
    return (
      <div className="jumbotron">
        <div className="container">
          <Loader loading={this.state.loading} error={this.state.error}>
            { this.state.loggedIn
                ? <Welcome />
                : <Form onSuccess={this.setState.bind(this, {loggedIn: true})}/>
            }
          </Loader>
        </div>
      </div>
    );
  }
});

module.exports = LoginForm;
