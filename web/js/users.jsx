'use strict';

var backbone = require('backbone');
var React = require('react');
var swal = require('sweetalert');
var lodash = require('lodash');
var Debug = require('./components/Debug.jsx');
var Loader = require('./components/Loader.jsx');
var utils = require('./utils');
var CollectionLoader = require('./components/CollectionLoader.jsx');

const MailTemplates = {
  report: {
    fr: {
      subject: 'Alerte - Votre compte a été signalé',
      text: `Bonjour,


On nous a signalé des comportements inappropriés venant de votre compte sur Triominos : {username}.

Triominos est un jeu familial et non un espace de rencontres, il existe d'autres applications pour cela. Nous comptons sur vous pour garder cela à l'esprit lorsque vous interagissez avec d'autres joueurs.

Cet email d'avertissement sera suivi d'un bannissement du jeu en cas de récidive. Merci de votre coopération.


Cordialement,

L'Equipe de Triominos
`
    }
  }
};

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

function Label (props) {
  const {level, children} = props;

  return (
    <small
    className={`label label-${level}`}
    style={{marginRight: '.5em'}}
    >
      {children}
    </small>
  );
}

function TransactionsGrouped(props){
  var transactionsArray = props.transactions;
  var groups = utils.groupBy(transactionsArray, 'currency', function(val){return val.replace(/^[a-z]+-/, '');});
  var keys = [];
  for (var key in groups) { 

    if (groups.hasOwnProperty(key)) {
      keys.push(key);
    }
  }

  const cumulativeSum = (sum => value => sum += value);
 
  return (<div className='col-md-8'>
    <b>Transactions</b>
    <div className='transaction-section'>
      {
        keys.map(k => {
          var sumForThisKey = cumulativeSum(0);
          return (
            <div key={k}>
              <h3>{k}</h3>
              <div className='table-wrapper-scroll-y my-custom-scrollbar'>
                <table className='table table-bordered table-striped mb-0'>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Item</th>
                      <th>Amount</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                  {
                    groups[k].sort((a, b) => {
                      return a.timestamp - b.timestamp;
                    }).map(transaction => {
                      return ( 
                          <Transaction key={transaction.id} {...transaction} balance={sumForThisKey(transaction.data.amount)} />
                      );
                    })
                  }
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      }
    </div>
  </div>);
}

function Transaction (props) { 
  var title = "Transaction<br/>" + utils.formatDate(props.timestamp);
  var what = (
    props.data.packId
    || props.data.itemId
    || props.data.rewardId
    || '')
    .replace('com.triominos.', '').split('.');
  what = what[what.length - 1];
  var amount = props.data.amount > 0 ? '+' + props.data.amount : props.data.amount;
  var currency = props.data.currency.replace(/^[a-z]+-/, '');
  var extra;
  if (!what)
    what = amount + ' ' + currency;
  else
    extra = amount + ' ' + currency;

  var p = props.data.packPurchase || {};
  var reason =
    props.data.from === 'admin' ? 'award'
    : p.type === 'claim' ? ''
    : p.type ? p.type
    : p.packId ? 'purchase'
    : props.reason;

  var from = props.data.from;
  if (from === 'pack' || from === 'virtualcurrency/v1') from = '';
 
  var details = props;

  var onClick = swal.bind(swal, {
    type: 'info',
    html: true,
    title: title,
    text: utils.reactToStaticHtml(<Debug.pre data={details}/>),
    allowOutsideClick: true
  }, () => {});

  return (
    <tr key={props.id} className='clickable' onClick={onClick}> 
      <td>{utils.formatDate(props.timestamp, 'YYYY-MM-DD')}</td>
      <td>{reason ? (reason + ' ') : ''}{what}{extra && <span className='unobtrusive'> {extra}</span>}</td>
      <td>{amount}</td>
      <td>{props.balance}</td> 
    </tr>
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
    //not used matchingIds,
    hasMatches,
    singleMatch
  } = props.results;

  return (
    <div>
      {
        hasMatches
          ? singleMatch
            ? null
            : <span>Multiple results, search again for one of the following IDs:</span>
          : <strong>No users found.</strong>
      }

      <ul>
        {
          hasMatches && !singleMatch && results.map(({found, method, args, userId}, idx) => {
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
  const {ban} = props;
  const level = ban.exists ? 'danger' : 'success';
  const status = ban.exists
    ? (<ClickForDetails title={utils.formatDate(ban.createdAt)} details={ban}>
          Banned {utils.formatDateFromNow(ban.createdAt)}
        </ClickForDetails>
      )
    : 'In Good Standing';

  return (
    <Label level={level}>
      {status}
    </Label>
  );
}


var usermetas = function (userId) {
  var Metas = backbone.Collection.extend({
    url: utils.apiPath(`/users/${encodeURIComponent(userId)}/usermeta`),
  });

  return new Metas();
};

var UserMeta = React.createBackboneClass({ 

  onSave: function () {
    utils.saveModel(
      this.getModel(),
      {value:  this.refs.valueInput.value},
      {},
      { success: 'Usermeta Saved',
        error: 'Failed to update meta' }
    );
  },

  render: function Meta () {
    var _meta = this.getModel();

    return (
      <div className="list-item">
        <div className="item-id">{_meta.get('id')}</div>
        <div className="item-costs">
          <div className="item-cost">
            <input
              type='text' 
              ref='valueInput'
              defaultValue={_meta.get('value')}
            />
          </div>
        </div>
        <button className="btn btn-xs btn-default" onClick={this.onSave}>Save</button>
      </div>
    );
  }
});

function UserMetaLists (props) {
  var usermetas = props.collection.map(function (m) {
    return (
      <div className="list-item-container" key={m.id}>
        <UserMeta model={m} />
      </div>
    );
  });

  return (<div>{usermetas}</div>);
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
    <div>
      <h4 className={props.className}>{lodash.get(props, 'directory.aliases.name') || ''}</h4>
      <small>ID:<code>{userId}</code></small>
    </div>
  );
}

function Profile (props) {
  var locale = props.metadata.location || '';
  if (props.metadata.locale) {
    if (!locale)
      locale = props.metadata.locale;
    else
      locale += ' (' + props.metadata.locale + ')';
  }
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
            value={
              lodash.has(props, 'directory.aliases.email')
                ? <a href={`mailto:${props.directory.aliases.email}`}>{props.directory.aliases.email}</a>
                : null
            }
            missingText="Email Missing"
          />

          <ProfilePiece
            value={
              props.metadata.auth
                ? <span>Seen {utils.formatDateFromNow(new Date(+props.metadata.auth))} <span className="unobtrusive">({utils.formatDate(new Date(+props.metadata.auth))})</span></span>
                : undefined}
            missingText="Last Auth Missing"
          />

          <i><ProfilePiece
            value={locale}
            missingText="Locale Missing"
          /></i>

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

            {props.directory.aliases.email && <AdminAction
              title="Send Email"
              onClick={() => sendEmailPrompt(props.username,
                props.directory.aliases.email,
                props.metadata.locale)}
            />}

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

          <br/>
          <div>
            <b>Usermetas:</b>
            <CollectionLoader
              collection={usermetas(props.username)}
              component={UserMetaLists}
            />
          </div>
          
        </div>

        <TransactionsGrouped transactions={props.transactions}/>
      </div>
      
    </div>
  );
}

const sendEmailPrompt = (userId, userEmail, userLocale) => {

  if (!userEmail) {
    return;
  }
  if (userLocale)
    userLocale = userLocale.slice(0, 2);

  selectTemplate((templateName) => {
    selectLocale(templateName, (locale) => {
      confirm(templateName, locale, (template) => {
        sendEmail(template);
      });
    });
  });

  function selectTemplate(callback) {
    if (Object.keys(MailTemplates).length === 1)
      return callback(Object.keys(MailTemplates)[0]);
    swal({
      title: 'Email User',
      text: utils.reactToStaticHtml(
        <div>
          Select a template ({Object.keys(MailTemplates).join(", ")})
        </div>
      ),
      html: true,
      type: 'input',
      inputPlaceholder: Object.keys(MailTemplates).join(', '),
      showCancelButton: true,
    }, (templateName) => {
      console.log({templateName});
      if (templateName === false || !MailTemplates[templateName])
        return;
      callback(templateName);
    });
  }

  function selectLocale(templateName, callback) {
    const template = MailTemplates[templateName];
    if (!template || Object.keys(template) === 0) {
      return;
    }
    const locales = Object.keys(template);
    if (userLocale && template[userLocale]) {
      return callback(userLocale);
    }
    else if (locales.length === 1) {
      return callback(locales[0]);
    }
    else {
      swal({
        title: 'Send Email',
        text: utils.reactToStaticHtml(
          <div>
            Select a locale ({locales.join(', ')})
          </div>
        ),
        html: true,
        type: 'input',
        inputPlaceholder: locales.join(', '),
        showCancelButton: true,
      }, (locale) => {
        console.log({templateName, locale});
        if (locale === false || !template[locale])
          return;
        callback(locale);
      });
    }
  }

  function confirm(templateName, locale, callback) {
    const template = MailTemplates[templateName][locale];
    let emailText = template.text;
    let emailSubject = template.subject;
    console.log('confirm', {templateName, locale, template});
    if (!template) return;
    swal({
      title: template.subject,
      text: `<code style="display: block; text-align: left;"><a style="display: block" href="#" id="email-text">${applyTemplate(template.text)}</a></code>`,
      html: true,
      closeOnConfirm: false,
      confirmButtonText: 'Send Email',
      disableButtonsOnConfirm: true,
      customClass: 'sweetalert-large',
      showCancelButton: true,
      showLoaderOnConfirm: true
    }, (result) => {
      if (result === false)
        return;
      callback({
        subject: emailSubject,
        text: emailText,
      });
    });
    setTimeout(() => {
      $('#email-text').editable({
        type: 'textarea',
        mode: 'inline',
        validate: (value) => {
          emailText = value;
        }
      });
      $('.sweet-alert h2').editable({
        type: 'text',
        mode: 'inline',
        validate: (value) => {
          emailSubject = value;
        }
      });
    }, 50);
  }

  function applyTemplate(template) {
    return template.replace('{username}', userId);
  }

  function toHTML(text) {
    return text.replace(/\n/g, '<br/>');
  }

  async function sendEmail(template) {
    try {
      const [res, body] = await utils.xhr({
        method: 'POST',
        url: utils.apiPath(`/send-email`),
        body: {
          to: userEmail,
          subject: applyTemplate(template.subject),
          text: applyTemplate(template.text),
          html: toHTML(applyTemplate(template.text))
        }
      });

      if (res.statusCode !== 200)
        throw body;

      swal({
        title: 'Send Email',
        type: 'success',
        text: utils.reactToStaticHtml(
          <div>
            Email has been sent to <strong>{userId}</strong>
          </div>
        ),
        html: true
      });
    }
    catch (ex) {
      swal({
        title: 'Send Email',
        type: 'error',
        text: utils.errorToHtml(ex),
        html: true
      });
    }
  }
};


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
    const changes = Object.entries(diff).reduce((acc, [key]) => {
      const stateKey = `search${key[0].toUpperCase()}${key.slice(1)}`;
      if (this.state.hasOwnProperty(stateKey))
        acc[stateKey] = diff[key];

      return acc;
    }, {});

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
