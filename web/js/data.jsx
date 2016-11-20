'use strict';

const React = require('react');
const lodash = require('lodash');
const swal = require('sweetalert');
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

  notifiyAboutDeletion (docId) {
    if (this.props.onDelete)
      this.props.onDelete(docId);
  }

  actuallyDelete (docId) {
    const {error, success} = utils.xhrMessages({
      errorTitle: 'Failed to Delete',
      successTitle: 'Document Deleted'
    });

    docs.delete(docId, (err) => {
      if (err)
        return error(err);

      success();
      this.notifiyAboutDeletion(docId);
      this.context.router.push(utils.webPath('/data'));
    });
  }

  onDelete (docId) {
    swal({
      title: "Are you sure?",
      text: "You will not be able to recover this document.",
      type: "warning",
      showCancelButton: true,
      confirmButtonText: "DELETE",
      cancelButtonText: "Cancel"
    }, (confirmed) => confirmed && this.actuallyDelete(docId));
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

class ListOfDocuments extends React.Component {
  constructor (props) {
    super(props);
  }

  render () {
    const {ids, showAll} = this.props;
    const sortedIds = ids.sort();
    const divs = (showAll ? sortedIds : sortedIds.slice(0, 10)).map(id => (
      <div key={id}>
        <Link to={`/data/${id}`}>
          <span style={{whiteSpace: 'nowrap'}}>{id}</span>
        </Link>
      </div>
    ));

    const wholeSetDisplayed = showAll || (ids.length === divs.length);
    const showAllText = wholeSetDisplayed ? '' : ` out of ${ids.length}`;
    const text = `Showing ${divs.length}${showAllText} results:`;

    const styles = {
      maxHeight: '15em',
      overflow: 'scroll',
      border: '1px solid #e7e7e7',
      padding: '.3em .5em'
    };

    return (
      <div>
        {text}
        <div style={styles}>
          {divs}
        </div>
      </div>
    );
  }
}

class DocsSearch extends React.Component {
  constructor (props) {
    super(props);

    this.debouncedListDocs = lodash.debounce(
      this.listDocs.bind(this),
      175
    );

    this.state = {
      term: '',
      results: [],
      showAll: true,
      loading: false,
      error: null
    };
  }

  listDocs () {
    const fn = this.state.term
      ? docs.search.bind(docs, this.state.term)
      : docs.list.bind(docs);

    this.setState({
      loading: true,
      error: null
    });

    fn((error, res, ids) => {
      const change = error
        ? {error}
        : {results: ids};

      this.setState(Object.assign({loading: false}, change));
    });
  }

  onSearchInputChanged (event) {
    const term = event.target.value;
    this.setState({
      term,
      loading: true,
      error: null
    }, this.debouncedListDocs);
  }

  onShowAllChanged (newShowAll) {
    this.setState({showAll: newShowAll});
  }

  componentDidMount () {
    this.listDocs();
  }

  render () {
    const {term, results, showAll, loading, error} = this.state;

    return (
      <div>
        <form className="form-inline">
          <div className="form-group">
            <label>Search docs…</label>
            <input type="text"
                   className="form-control"
                   value={term}
                   onChange={this.onSearchInputChanged.bind(this)}
            />
          </div>

          <div className="checkbox">
            <label>
              <input type="checkbox"
                     checked={showAll}
                     onChange={event => this.onShowAllChanged(event.target.checked)}
              />
              {' Show all results' }
            </label>
          </div>
        </form>

        <Loader loading={loading} error={error}>
          {
            results.length === 0
              ? 'Nothing found'
              : <div>
                  <ListOfDocuments ids={results} showAll={showAll} />
                </div>
          }
        </Loader>
      </div>
    );
  }
}

class Layout extends React.Component {
  constructor (props) {
    super(props);

    this.state = {
      newDocId: '',
      newDocJson: '{}'
    };
  }

  onInsert () {
    const {newDocId, newDocJson} = this.state;
    const {error, success} = utils.xhrMessages({
      errorTitle: 'Failed to Insert',
      successTitle: 'Document Created'
    });
    const refreshSearch = this.refs.search.listDocs.bind(this.refs.search);

    docs.insert(newDocId, newDocJson, (err, res, body) => {
      if (err)
        return error(err);

      success(body);
      this.setState({
        newDocId: '',
        newDocJson: '{}'
      }, refreshSearch);
    });
  }

  render () {
    const {
      newDocId, newDocJson
    } = this.state;
    const hasExistingDoc = this.props.params.hasOwnProperty('docId');

    return (
      <div>
        <DocsSearch ref="search" />

        <div>
          {
            hasExistingDoc
              ? <Document params={this.props.params} onDelete={() => this.refs.search.listDocs()} />
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
