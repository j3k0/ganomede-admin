'use strict';

const React = require('react');
const lodash = require('lodash');
const swal = require('sweetalert');
const {Tab, Tabs, TabList, TabPanel} = require('react-tabs');
const JsonEditor = require('./components/JsonEditor.jsx');
const Debug = require('./components/Debug.jsx');
const Loader = require('./components/Loader.jsx');
const {Link} = require('./components/Links.jsx');
const utils = require('./utils');
const csvImport = require('./data-csv-import');

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

  batchInsert (documents, callback) {
    // TODO
    // check docs

    utils.xhr({
      method: 'post',
      url: this.url('_bulk_upsert'),
      body: {documents}
    }, this.wrapCb(callback));
  },

  fetch (id, callback) {
    utils.xhr({
      method: 'get',
      url: this.url(id),
      // Even though we only need a string to put into editor,
      // parsing JSON makes it human readable with indents and newlines.
      json: true
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
    const {ids} = this.props;
    const divs = ids.sort().map(id => (
      <div key={id}>
        <Link to={`/data/${id}`}>
          <span style={{whiteSpace: 'nowrap'}}>{id}</span>
        </Link>
      </div>
    ));

    const styles = {
      height: '15em',
      overflow: 'scroll',
      border: '1px solid #e7e7e7',
      padding: '.3em .5em'
    };

    return (
      <div style={styles}>
        {divs}
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
      showResults: props.showResults,
      showResultsChangedByUser: false,
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
      error: null,
      showResults: true
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

  componentWillReceiveProps (newProps) {
    const {showResults, showResultsChangedByUser} = this.state;

    if (showResultsChangedByUser)
      return;

    if (newProps.showResults !== showResults)
      this.setState({showResults: newProps.showResults});
  }

  toggleResultsVisibility () {
    const {showResults} = this.state;
    this.setState({
      showResults: !showResults,
      showResultsChangedByUser: true
    });
  }

  renderShowToggler () {
    const {showResults, results} = this.state;
    const verb = showResults ? 'hide' : 'show';

    return (
      <div>
        <span className="clickable"
            onClick={() => this.toggleResultsVisibility()}
        >
         Found {results.length} documents
         {' '}
         <small>(click to {verb})</small>
         :
        </span>
       </div>
     );
  }

  render () {
    const {term, results, showResults, loading, error} = this.state;

    return (
      <div>
        <form className="form-horizontal">
          <div className="form-group">
            <label className="col-sm-2 control-label">
              Search docs…
            </label>

            <div className="col-sm-6">
              <input type="text"
                     className="form-control"
                     placeholder="Type in document ID or its part…"
                     value={term}
                     onChange={this.onSearchInputChanged.bind(this)}
              />
            </div>

            <div className="col-sm-4">
              <label className="control-label">{this.renderShowToggler()}</label>
            </div>
          </div>
        </form>

        <Loader loading={loading} error={error}>
          {(results.length === 0) && 'Nothing found'}
          {showResults && results.length
            ? <ListOfDocuments ids={results} />
            : null
          }
        </Loader>
      </div>
    );
  }
}

const ImportPreview = (props) => {
  const {documents} = props;
  const ids = Object.keys(documents);
  const lists = lodash.values(documents);

  const headers = ids.map((id, index) => (
    <th key={id}>
      {id + ' '}
      <small className="unobtrusive">
        {lists[index].length} items
      </small>
    </th>
  ));

  const rows = [];
  const longestList = Math.max(...lists.map(list => list.length));

  for (let row = 0; row < longestList; ++row) {
    const tds = ids.map((id, col) => {
      const list = lists[col];
      const value = list[row];

      return (
        <td key={col}>{value || ''}</td>
      );
    });

    rows.push(<tr key={row}>{tds}</tr>);
  }

  return (
    <div>
      <p>
        About to create <strong>{lists.length} documents</strong>.
      </p>

      <table className="table table-condensed table-hover">
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
};

const Messages = ({level, messages}) => {
  if (messages.length === 0)
    return null;

  const alerts = messages.map((text, index) => (
    <li key={index}>{text}</li>
  ));

  return (
    <div className={`alert alert-${level}`}>
      <ol>{alerts}</ol>
    </div>
  );
};

const WarningsList = ({title, warnings}) => {
  return (warnings.length > 0) && (
    <li>
      {title}
      <Messages level="warning" messages={warnings} />
    </li>
  );
};

const RenderWarnings = ({warnings}) => {
  const {ignoredColumns, mergedColumns, removedDuplicates} = warnings;
  const totalWarnings = ignoredColumns.length + mergedColumns.length + removedDuplicates.length;

  if (totalWarnings === 0)
    return null;

  return (
    <div>
      Fixed {totalWarnings} warnings in CSV file:
      <ul>
        {ignoredColumns && <WarningsList title="Ignored Columns" warnings={ignoredColumns} /> }
        {mergedColumns && <WarningsList title="Merged Columns with Same ID" warnings={mergedColumns} /> }
        {removedDuplicates && <WarningsList title="Duplicate Words Removed" warnings={removedDuplicates} /> }
      </ul>
    </div>
  );
};

const defaultWarnings = () => ({
  ignoredColumns: [],
  mergedColumns: [],
  removedDuplicates: []
});

class DataCreation extends React.Component {
  constructor (props) {
    super(props);

    this.TABS = {
      'newDoc': 0,
      'csvImport': 1
    };

    this.TAB_LABELS = [
      'Create New Document',
      'Import CSV File'
    ];

    this.state = {
      activeTab: this.TABS.newDoc,
      newDocId: '',
      newDocJson: '',
      csvError: null,
      csvResult: null,
      csvErrors: [],
      csvWarnings: defaultWarnings()
    };

    this.tabHeaders = this.TAB_LABELS.map((label, index) => (
      <Tab key={index}>{label}</Tab>
    ));
  }

  onInsert () {
    const {onCreate} = this.props;
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
      }, onCreate);
    });
  }

  onImport () {
    const {onCreate} = this.props;
    const {csvResult, csvErrors} = this.state;
    const {error, success} = utils.xhrMessages({
      errorTitle: 'Failed to Import',
      successTitle: 'Import Succeeded'
    });

    // should not really happen, so alert() instead of pretty message for now
    const canInsert = csvResult && (csvErrors.length === 0);
    if (!canInsert)
      return setTimeout(() => alert('CSV has errors, can not import.'), 0);

    docs.batchInsert(csvResult, (err, res, body) => {
      if (err)
        return error(err);

      success(body);

      this.refs['csv-file-input'].value = null;
      this.setState({
        csvError: null,
        csvResult: null,
        csvErrors: [],
        csvWarnings: defaultWarnings()
      }, onCreate);
    });
  }

  handleTabChange (newIndex) {
    this.setState({activeTab: newIndex});
  }

  readFile (file) {
    csvImport(file, (csvError, csvResult, {errors, warnings}) => {
      const change = csvError
        ? {csvError, csvResult: null, csvErrors: [], csvWarnings: defaultWarnings()}
        : {csvError: null, csvResult, csvErrors: errors, csvWarnings: warnings};

      this.setState(change);
    });
  }

  renderTab (activeTab) {
    switch (activeTab) {
      case this.TABS.newDoc: {
        const {newDocId, newDocJson} = this.state;

        return (
          <div>
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
        );
      }

      case this.TABS.csvImport: {
        const {csvError, csvResult, csvErrors, csvWarnings} = this.state;

        const errorMessage = csvError && (<Debug.pre data={csvError} />);
        const importPreview = csvResult && (<ImportPreview documents={csvResult} />);
        const saveButton = csvResult && (csvErrors.length === 0) && (
          <button className="btn btn-primary" role="button"
                  onClick={() => this.onImport()}
          >
            Save
          </button>
        );

        const errors = (csvErrors.length > 0) && <Messages level="danger" messages={csvErrors} />;

        return (
          <div>
            <input type="file"
                   accept=".csv"
                   ref="csv-file-input"
                   onChange={event => {
                    const file = event.target.files[0];
                    if (file)
                      this.readFile(file);
                   }}
            />

            {saveButton}
            {errorMessage}
            {errors}
            <RenderWarnings warnings={csvWarnings} />
            {errorMessage ? null : importPreview}
          </div>
        );
      }

      default:
        throw new Error('Invalid Tab');
    }
  }

  render () {
    const {activeTab} = this.state;
    const tabContents = this.TAB_LABELS.map((label, index) => (
      <TabPanel key={index}>
        {this.renderTab(index)}
      </TabPanel>
    ));

    return (
      <Tabs
        onSelect={this.handleTabChange.bind(this)}
        selectedIndex={activeTab}
      >
        <TabList>{this.tabHeaders}</TabList>
        {tabContents}
      </Tabs>
    );
  }
}

class DataLayout extends React.Component {
  constructor (props) {
    super(props);
  }

  render () {
    const hasExistingDoc = this.props.params.hasOwnProperty('docId');
    const refreshSearch = () => this.refs.search.listDocs();
    const child = hasExistingDoc
      ? (<Document params={this.props.params} onDelete={refreshSearch} />)
      : (<DataCreation onCreate={refreshSearch} />);

    return (
      <div>
        <DocsSearch showResults={!hasExistingDoc} ref="search" />
        <br />
        {child}
      </div>
    );
  }
}

module.exports = DataLayout;
