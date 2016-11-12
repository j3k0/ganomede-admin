'use strict';

const React = require('react');
const lodash = require('lodash');
const JsonEditor = require('./components/JsonEditor.jsx');
const Loader = require('./components/Loader.jsx');
const {Link} = require('./components/Links.jsx');
const utils = require('./utils');

const docs = {
  url (id) {
    const docIdParam = (arguments.length === 1)
      ? `/${encodeURIComponent(id)}`
      : '';

    return utils.apiPath(`/data/docs${docIdParam}`);
  },

  parseDocJson (json) {
    try {
      const parsed = JSON.parse(json);

      if (typeof parsed !== 'object')
        return new Error('Document must be object');

      if (!parsed)
        return new Error('Document can not be falthy');

      return parsed;
    }
    catch (e) {
      return e;
    }
  },

  wrapCb (cb) {
    return (err, res, body) => {
      if (!err) {
        if ((res.statusCode < 200) || (res.statusCode > 299))
          err = body;
      }

      cb(err, res, body);
    };
  },

  list (callback) {
    utils.xhr({
      method: 'get',
      url: this.url()
    }, this.wrapCb(callback));
  },

  search (query, callback) {
    utils.xhr({
      method: 'get',
      url: this.url(),
      qs: {q: query}
    }, this.wrapCb(callback));
  },

  insert (id, json, callback) {
    const document = this.parseDocJson(json);

    if (document instanceof Error)
      return setTimeout(callback, 0, document);

    utils.xhr({
      method: 'post',
      url: this.url(),
      body: id ? {id, document} : {document}
    }, this.wrapCb(callback));
  },

  fetch (id, callback) {
    utils.xhr({
      method: 'get',
      url: this.url(id),
      gzip: true,
      json: false // no need to parse response
    }, this.wrapCb(callback));
  },

  replace (id, json, callback) {
    const document = this.parseDocJson(json);

    if (document instanceof Error)
      return setTimeout(callback, 0, document);

    utils.xhr({
      method: 'post',
      url: this.url(id),
      body: {document}
    }, this.wrapCb(callback));
  },

  delete (id, callback) {
    utils.xhr({
      method: 'delete',
      url: this.url(id)
    }, this.wrapCb(callback));
  }
};

class Document extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      error: null,
      loading: false,
      doc: null
    };
  }

  componentDidMount () {
    this.fetch();
  }

  componentWillReceiveProps () {
    this.setState({
      error: null,
      loading: true
    }, this.fetch.bind(this));
  }

  fetch () {
    const {docId} = this.props.params;

    this.setState({
      error: null,
      loading: true
    });

    docs.fetch(docId, (error, res, doc) => {
      this.setState({
        loading: false,
        error,
        doc
      });
    });
  }

  onReplace (docId, json) {
    const {error, success} = utils.xhrMessages({
      errorTitle: 'Failed to Replacce',
      successTitle: 'Document Replaced'
    });

    docs.replace(docId, json, (err) => {
      if (err)
        return error(err);

      success();
    });
  }

  onDelete (docId) {
    const {error, success} = utils.xhrMessages({
      errorTitle: 'Failed to Delete',
      successTitle: 'Document Deleted'
    });

    docs.delete(docId, (err) => {
      if (err)
        return error(err);

      success();
      this.context.router.push(utils.webPath('/data'));
    });
  }

  render () {
    const {loading, error, doc} = this.state;
    const {docId} = this.props.params;
    const json = JSON.stringify(doc, null, 2);

    return (
      <div>
        <h3>{docId}</h3>

        <button className="btn" role="button"
                onClick={() => this.context.router.push(utils.webPath('/data'))}
        >
          Back
        </button>

        <button className="btn btn-primary" role="button"
                onClick={() => this.onReplace(docId, this.refs.editor.val())}
        >
          Replace
        </button>

        <button className="btn btn-danger" role="button"
                onClick={() => this.onDelete(docId)}
        >
          Delete
        </button>

        <Loader loading={loading} error={error}>
          { doc && <JsonEditor ref="editor" json={json} /> }
        </Loader>
      </div>
    );
  }
}

Document.contextTypes = {
  router: React.PropTypes.object
};

class Layout extends React.Component {
  constructor (props) {
    super(props);

    this.debouncedListDocs = lodash.debounce(
      this.listDocs.bind(this),
      175
    );

    this.state = {
      loading: true,
      error: null,
      searchTerm: '',
      searchResults: [],
      newDocId: '',
      newDocJson: '{}'
    };
  }

  listDocs () {
    const fn = this.state.searchTerm
      ? docs.search.bind(docs, this.state.searchTerm)
      : docs.list.bind(docs);

    this.setState({
      loading: true,
      error: null
    });

    fn((error, res, ids) => {
      const change = error
        ? {error}
        : {searchResults: ids};

      this.setState(Object.assign({loading: false}, change));
    });
  }

  onSearchInputChanged (event) {
    const searchTerm = event.target.value;
    this.setState({
      searchTerm,
      loading: true,
      error: null
    }, this.debouncedListDocs);
  }

  componentDidMount () {
    this.listDocs();
  }

  onInsert () {
    const {newDocId, newDocJson} = this.state;
    const {error, success} = utils.xhrMessages({
      errorTitle: 'Failed to Insert',
      successTitle: 'Document Created'
    });

    docs.insert(newDocId, newDocJson, (err, res, body) => {
      if (err)
        return error(err);

      success(body);
      this.setState({
        newDocId: '',
        newDocJson: '{}'
      }, this.debouncedListDocs);
    });
  }

  render () {
    const {
      searchResults, searchTerm,
      loading, error,
      newDocId, newDocJson
    } = this.state;
    const {children} = this.props;
    const hasExistingDoc = this.props.params.hasOwnProperty('docId');

    return (
      <div>
        <div>
          Search docs…
          <input value={searchTerm}
                 onChange={this.onSearchInputChanged.bind(this)}
          />
        </div>

        <Loader loading={loading} error={error}>
          {
            searchResults.length === 0
              ? 'Nothing found'
              : searchResults.map(id => (
                  <div key={id}>
                    <Link to={`/data/${id}`}>{id}</Link>
                  </div>
                ))
          }
        </Loader>

        <div>
          {
            hasExistingDoc
              ? children
              : <div>
                  <h3>Insert New Document</h3>
                  <input
                    type="text"
                    placeholder="Custom ID"
                    value={newDocId}
                    onChange={e => this.setState({newDocId: e.target.value})}
                  />
                  <button className="btn btn-primary" role="button"
                          onClick={() => this.onInsert()}
                  >
                    Insert
                  </button>
                  <JsonEditor
                    json={newDocJson}
                    onChange={json => this.setState({newDocJson: json})}
                  />
                </div>
          }
        </div>
      </div>
    );
  }
}

module.exports = {
  Layout,
  Document
};
