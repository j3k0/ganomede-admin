'use strict';

var backbone = require('backbone');
var React = require('react');
var Debug = require('./components/Debug.jsx');

var User = backbone.Model.extend({
  idAttribute: 'username',
  urlRoot: '../api/users'
});

function Profile (props) {
  return (
    <Debug.pre data={props.profile} />
  );
};

var Search = React.createClass({
  getInitialState: function () {
    var hasUser = this.props.params.hasOwnProperty('username');

    return {
      index: !hasUser,
      username: hasUser ? this.props.params.username : null,
      profile: null,
      loading: hasUser,
      error: null
    };
  },

  fetchProfile: function (username) {
    var profile = new User({username: username});

    var updateState = function (success) {
      this.setState({
        profile: profile,
        loading: false,
        error: !success
      });
    };

    this.setState({
      loading: true
    });

    profile.fetch({
      success: updateState.bind(this, true),
      error: updateState.bind(this, false)
    });
  },

  componentWillMount: function () {
    // fetch user profile, if we have one
    if (this.state.username)
      this.fetchProfile(this.state.username);
  },

  render: function () {
    return (
      <div>
        <Debug.pre data={this.state} />
        <Profile profile={this.state.profile} />
      </div>
    );
  }
});

module.exports = {
  Search: Search,
  Profile: Profile
};
