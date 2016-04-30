'use strict';

var backbone = require('backbone');
var React = require('react');
var ReactDOMServer = require('react-dom/server');
var swal = require('sweetalert');
var moment = require('moment');
var Debug = require('./components/Debug.jsx');
var Loader = require('./components/Loader.jsx');
var utils = require('./utils');

var User = backbone.Model.extend({
  idAttribute: 'username',
  urlRoot: '../api/users'
});

function Transaction (props) {
  var onClick = swal.bind(swal, {
    type: 'info',
    html: true,
    title: 'Transaction',
    text: ReactDOMServer.renderToStaticMarkup(<Debug.pre data={props}/>),
    allowOutsideClick: true
  });

  return (
    <span className='clickable' onClick={onClick}>
      {props.reason} {props.data.amount}&nbsp;{props.data.currency}
      {' '}
      <span className='unobtrusive'>{moment(props.timestamp).fromNow()}</span>
    </span>
  );
}

var AwardForm = React.createClass({
  contextTypes: {
    currencies: React.PropTypes.arrayOf(React.PropTypes.string)
  },

  render: function () {
    return (
      <form className='form-inline' onSubmit={
        event => {
          event.preventDefault();
          this.props.onAward({
            amount: parseInt(this.refs.amountInput.value, 10),
            currency: this.refs.currencyInput.value
          })
        }
      }>
        <input type='text' ref='amountInput' defaultValue={0} />
        <select ref='currencyInput' defaultValue={this.context.currencies[0]}>{
          this.context.currencies.map(function (currency) {
            return (
              <option value={currency}>{currency}</option>
            );
          })
        }</select>
        <input type='submit' className='btn btn-default' value='Award' />
      </form>
    );
  }
});

function Profile (props) {
  // TODO
  // Remove this temporary warning in case user is missing.
  var warning = props.metadata.location
    ? undefined
    : (<small className='label label-danger' style={{marginRight: '.5em'}}>Might Not Exist</small>);

  return (
    <div className='container-fluid'>
      <div className='row media'>
        <div className='media-left avatar'>{
          props.avatar
            ? <img className='media-object' src={props.avatar} />
            : <span className='media-object no-avatar unobtrusive'>Avatar Missing</span>
        }</div>
        <div className='media-body'>
          <h4 className="media-heading">
            {warning}
            {props.username}
          </h4>
          { props.metadata.location ||
            <span className='unobtrusive'>Location Missing</span>
          }
        </div>
      </div>

      <div className='row'>
        <div className='col-md-4'>
          <b>Balance</b>
          <ul className='list-unstyled'>{
            Object.keys(props.balance).sort().map(cur => {
              return (<li key={cur}>{props.balance[cur]}&nbsp;{cur}</li>);
            })
          }</ul>

          <AwardForm onAward={props.onAward}/>
        </div>

        <div className='col-md-4'>
          <b>Transactions</b>
          <ul className='list-unstyled'>{
            props.transactions.map(transaction => {
              return (
                <li key={transaction.id}>
                  <Transaction {...transaction} />
                </li>
              );
            })
          }</ul>
        </div>
      </div>
    </div>
  );
};

var Search = React.createClass({
  contextTypes: {
    router: React.PropTypes.object
  },

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

    // We are no longer at index route and are loading user profile.
    this.context.router.push('/users/' + username);
    this.setState({
      index: false,
      loading: true,
      username: username
    });

    var updateState = function (error) {
      this.setState({
        profile: profile,
        loading: false,
        error: error
      });
    }.bind(this);

    profile.fetch({
      success: updateState.bind(this, null),
      error: function (model, xhr, options) {
        updateState(xhr.responseJSON || xhr.responseText || 'Server Error');
      }
    });
  },

  componentWillMount: function () {
    // fetch user profile, if we have one
    if (this.state.username)
      this.fetchProfile(this.state.username);
  },

  componentWillReceiveProps: function (newProps) {
    // If we are going username-less, it means we are
    // being rendered at /users and not /users/:username.
    // Update state accordingly.
    if (!newProps.params.hasOwnProperty('username'))
      this.setState({index: true});
  },

  renderForm: function () {
    return (
      <form className='form-inline' onSubmit={
        event => {
          event.preventDefault();
          this.fetchProfile(this.refs.usernameInput.value);
        }
      }>
        <input type='text'
          ref='usernameInput'
          className='form-control'
          placeholder='Type in username…'
          defaultValue={this.state.username}
        />
        <input type='submit' className='btn btn-primary' value='Find' />
      </form>
    );
  },

  award: function (award) {
    var title = 'Awarding ' + this.state.username;
    var message = [
      'You are about to send',
      award.amount,
      award.currency,
      'to',
      this.state.username + '.',
      '\nProceed?'
    ].join(' ');

    swal({
      title: title,
      text: message,
      type: 'info',
      showCancelButton: true,
      closeOnConfirm: false,
      showLoaderOnConfirm: true
    }, function () {
      var showSuccessMessage = swal.bind(swal, {
        title: title,
        type: 'success',
        text: 'Award received',
      });

      var showErrorMessage = function (error) {
        swal({
          type: 'error',
          title: title,
          text: utils.errorToHtml(error),
          html: true
        });
      };

      utils.xhr({
        method: 'post',
        url: this.state.profile.url() + '/rewards',
        body: award
      }, (err, res, data) => {
        if (err)
          return showErrorMessage(err);

        if (res.statusCode !== 200)
          return showErrorMessage(data);

        this.fetchProfile(this.state.username);
        showSuccessMessage();
      });
    }.bind(this));
  },

  renderProfile: function () {
    // Render hint if we have no username.
    if (this.state.index)
      return <p>Type in username and hit Find button.</p>;

    // We might have `null` for profile if it hasn't loaded yet.
    var profile = this.state.profile && this.state.profile.toJSON();

    return (
      <Loader loading={this.state.loading} error={this.state.error}>
        <Profile {...profile} onAward={this.award} />
      </Loader>
    );
  },

  render: function () {
    return (
      <div>
        { this.renderForm() }
        <hr/>
        { this.renderProfile() }
      </div>
    );
  }
});

module.exports = {
  Search: Search,
  Profile: Profile
};
