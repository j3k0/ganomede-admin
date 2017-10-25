'use strict';

var backbone = require('backbone');
var React = require('react');
var swal = require('sweetalert');
var lodash = require('lodash');
var Debug = require('./components/Debug.jsx');
var Loader = require('./components/Loader.jsx');
var utils = require('./utils');

var User = backbone.Model.extend({
  idAttribute: 'username',
  urlRoot: utils.apiPath('/users')
});

function ClickForDetails (props) {
  var title = props.title;
  var details = props.details;

  var onClick = swal.bind(swal, {
    type: 'info',
    html: true,
    title: title,
    text: utils.reactToStaticHtml(<Debug.pre data={details}/>),
    allowOutsideClick: true
  }, () => {});

  return (
    <span className="clickable" onClick={onClick}>
      {props.children}
    </span>
  );
}

function WarningLabel (props) {
  return (
    <small
      className='label label-danger'
      style={{marginRight: '.5em'}}
    >
      {props.children}
    </small>
  );
}

function Transaction (props) {
  var title = "Transaction<br/>" + utils.formatDate(props.timestamp);

  return (
    <ClickForDetails title={title} details={props}>
     {props.reason} {props.data.amount}&nbsp;{props.data.currency}
     {' '}
     <span className='unobtrusive'>{utils.formatDateFromNow(props.timestamp)}</span>
    </ClickForDetails>
  );
}

const processSearchResults = (rawData) => {
  if (rawData === null)
    return null;

  const {query, results, matchingIds} = rawData;
  const hasMatches = matchingIds.length > 0;
  const singleMatch = matchingIds.length === 1 || lodash.uniq(matchingIds).length === 1;

  return {
    query,
    results,
    matchingIds,
    hasMatches,
    singleMatch
  };
};

function SearchResults (props) {
  // No need to render anything, no lookups were performed.
  if (props.results === null)
    return null;

  const {
    query,
    results,
    matchingIds,
    hasMatches,
    singleMatch
  } = props.results;

  return (
    <div>
      {
        hasMatches
          ? singleMatch
            ? <span>Found single User ID <strong>{matchingIds[0]}</strong>:</span>
            : <span>Multiple results, search again for one of the following IDs:</span>
          : <span>No users found, lookups performed:</span>
      }

      <ul>
        {
          results.map(({found, method, args, userId}, idx) => {
            return (
              <li key={`${query}-${idx}`}>
                <code>{method}({args.map(JSON.stringify).join(', ')})</code>
                {': '}
                <span>{found ? <strong>{userId}</strong> : '<no match>'}</span>
              </li>
            );
          })
        }
      </ul>
    </div>
  );


  return (<Debug.pre data={results} />);
};

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
          });
        }
      }>
        <input type='text' ref='amountInput' defaultValue={0} />
        <select ref='currencyInput' defaultValue={this.context.currencies[0]}>{
          this.context.currencies.map(function (currency) {
            return (
              <option key={currency} value={currency}>{currency}</option>
            );
          })
        }</select>
        <input type='submit' className='btn btn-default' value='Award' />
      </form>
    );
  }
});

function BanInfo (props) {
  var ban = props.ban;

  var status = ban.exists
    ? (<WarningLabel>
        <ClickForDetails title={utils.formatDate(ban.createdAt)} details={ban}>
          Banned {utils.formatDateFromNow(ban.createdAt)}
        </ClickForDetails>
      </WarningLabel>)
    : 'In Good Standing';

  return (
    <div>{status}</div>
  );
}

function ProfilePiece (props) {
  return (
    <div>
      {props.value || <span className="unobtrusive">{props.missingText}</span>}
    </div>
  );
}

function AdminAction (props) {
  const {title, onClick} = props;

  return (
    <button className="AdminAction btn btn-default" onClick={onClick}>
      {title}
    </button>
  );
}

function ProfileHeader (props) {
  const {userId} = props;

  return (
    <h4 className={props.className}>
      {lodash.get(props, 'directory.aliases.name') || ''}
      {' '}
      <small>
        User ID <code>{props.userId}</code>
      </small>
    </h4>
  );
}

function Profile (props) {
  return (
    <div className='container-fluid'>
      <div className='row media'>
        <div className='media-left avatar'>{
          props.avatar
            ? <img className='media-object' src={props.avatar} />
            : <span className='media-object no-avatar unobtrusive'>Avatar Missing</span>
        }</div>
        <div className='media-body'>
          <ProfileHeader
            className="media-heading"
            userId={props.username}
            directory={props.directory}
          />

          <ProfilePiece
            value={lodash.get(props, 'directory.aliases.email')}
            missingText="Email Missing"
          />

          <ProfilePiece
            value={props.metadata.location}
            missingText="Location Missing"
          />

          <ProfilePiece
            value={props.banInfo && <BanInfo ban={props.banInfo} />}
            missingText="Ban Info Missing"
          />
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <b>Admin Actions</b>
          <div>
            <AdminAction
              title="Reset Password"
              onClick={() => changePasswordPrompt(props.username)}
            />

            <AdminAction
              title={props.banInfo.exists ? 'Unban' : 'Ban'}
              onClick={props.toggleBan.bind(null, props.banInfo.exists ? 'unban' : 'ban')}
            />
          </div>
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
}

const changePasswordPrompt = (userId) => {
  const title = 'Password Change';

  swal({
    title,
    text: utils.reactToStaticHtml(
      <div>
        Type in new password for <strong>{userId}</strong> below.
      </div>
    ),
    html: true,
    type: 'input',
    inputValue: utils.passwordSuggestion(),
    inputPlaceholder: 'Type in new password…',
    closeOnConfirm: false,
    disableButtonsOnConfirm: true,
    showCancelButton: true,
    showLoaderOnConfirm: true
  }, async (newPassword) => {
    if (newPassword === false)
      return;

    try {
      const [res, body] = await utils.xhr({
        method: 'POST',
        url: utils.apiPath(`/users/${encodeURIComponent(userId)}/password-reset`),
        body: {newPassword}
      });

      if (res.statusCode !== 200)
        throw body;

      swal({
        title,
        type: 'success',
        text: utils.reactToStaticHtml(
          <div>
            Password of user <strong>{userId}</strong> has been changed to
            {' '}
            <code>{newPassword}</code>.
          </div>
        ),
        html: true
      });
    }
    catch (ex) {
      swal({
        title,
        type: 'error',
        text: utils.errorToHtml(ex),
        html: true
      });
    }
  });
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
      searchLoading: false,
      searchQuery: '',
      searchResults: null,
      searchError: null,
      profile: null,
      loading: hasUser,
      error: null
    };
  },

  // Set one/multi of:
  // diff is object with keys {loading, query, error, results}
  setSearchState (diff = {}, callback = function () {}) {
    const changes = Object.entries(diff).reduce((acc, [key, val]) => {
      const stateKey = `search${key[0].toUpperCase()}${key.slice(1)}`;
      if (this.state.hasOwnProperty(stateKey))
        acc[stateKey] = diff[key];

      return acc;
    }, {});

    console.dir(changes)

    this.setState(changes, callback);
  },

  resolveUserId: function (query) {
    this.setSearchState({loading: true, query});

    utils.xhr({
      method: 'get',
      url: utils.apiPath('/users/search/' + encodeURIComponent(query)),
    }, (err, res, data) => {
      const error = err || (res.statusCode === 200 ? null : data);
      this.setSearchState({
        loading: false,
        error: error || null,
        results: error ? null : processSearchResults(data)
      }, () => {
        if (this.state.searchError)
          return;

        if (this.state.searchResults.singleMatch)
          this.fetchProfile(this.state.searchResults.matchingIds[0]);
      });
    });
  },

  fetchProfile: function (username) {
    var profile = new User({username: username});

    // We are no longer at index route and are loading user profile.
    this.context.router.push(utils.webPath('/users/' + username));
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
      error: function (model, xhr/*, options*/) {
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
      <div>
        <form className='form-inline' onSubmit={
          event => {
            event.preventDefault();
            this.resolveUserId(this.refs.usernameInput.value);
          }
        }>
          <input type='text'
            ref='usernameInput'
            className='form-control'
            placeholder='Seach for users: id, alias, etc…'
            defaultValue={this.state.searchQuery}
          />
          <input type='submit' className='btn btn-primary' value='Find' />
        </form>

        <Loader error={this.state.searchError} loading={this.state.searchLoading}>
          <SearchResults results={this.state.searchResults} />
        </Loader>
      </div>
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

  toggleBan: function (action) {
    utils.xhr({
      method: 'post',
      url: this.state.profile.url() + '/' + action
    }, (err, res, data) => {
      var title = action[0].toUpperCase() + action.slice(1);

      var showSuccessMessage = swal.bind(swal, {
        title: title,
        type: 'success',
        text: `User ${this.state.username} is now ${action}ed.`,
      });

      var showErrorMessage = function (error) {
        swal({
          type: 'error',
          title: title,
          text: utils.errorToHtml(error),
          html: true
        });
      };

      if (err)
        return showErrorMessage(err);

      if (res.statusCode !== 200)
        return showErrorMessage(data);

      this.fetchProfile(this.state.username);
      showSuccessMessage();
    });
  },

  renderProfile: function () {
    // Render hint if we have no username.
    if (this.state.index)
      return <p>Type in username and hit Find button.</p>;

    // We might have `null` for profile if it hasn't loaded yet.
    var profile = this.state.profile && this.state.profile.toJSON();

    return (
      <Loader loading={this.state.loading} error={this.state.error}>
        <Profile
          {...profile}
          onAward={this.award}
          toggleBan={this.toggleBan}
        />
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
