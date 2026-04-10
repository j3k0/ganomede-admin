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

const downloadJson = (data, filename) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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
  },

  bulkFetch (ids, onProgress, callback) {
    const results = {};
    let completed = 0;
    const errors = [];
    const BATCH_SIZE = 5;

    const fetchOne = (id, cb) => {
      this.fetch(id, (err, res, body) => {
        completed++;
        if (err) {
          errors.push({id, error: err});
        } else {
          results[id] = body;
        }
        onProgress({completed, total: ids.length, failed: errors.length});
        cb();
      });
    };

    const processBatch = (startIndex) => {
      if (startIndex >= ids.length) {
        return callback(null, results, errors);
      }

      const batch = ids.slice(startIndex, startIndex + BATCH_SIZE);
      let batchDone = 0;

      batch.forEach(id => {
        fetchOne(id, () => {
          batchDone++;
          if (batchDone === batch.length) {
            processBatch(startIndex + BATCH_SIZE);
          }
        });
      });
    };

    processBatch(0);
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
      error: null,
      backupInProgress: false,
      backupProgress: null
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

  startBackup () {
    const {results, term} = this.state;
    if (results.length === 0) return;

    this.setState({
      backupInProgress: true,
      backupProgress: {completed: 0, total: results.length, failed: 0}
    });

    docs.bulkFetch(
      results,
      (progress) => this.setState({backupProgress: progress}),
      (err, data, fetchErrors) => {
        this.setState({backupInProgress: false, backupProgress: null});

        if (fetchErrors.length > 0) {
          swal({
            title: 'Backup Complete with Warnings',
            text: `${fetchErrors.length} document(s) could not be fetched.`,
            type: 'warning'
          });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = term
          ? `backup-${term}-${timestamp}.json`
          : `backup-all-${timestamp}.json`;
        downloadJson(data, filename);
      }
    );
  }

  renderShowToggler () {
    const {showResults, results, backupInProgress, backupProgress} = this.state;
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
        {' '}
        {!backupInProgress && results.length > 0 && (
          <button className="btn btn-default btn-xs"
            onClick={() => this.startBackup()}
          >
            <span className="glyphicon glyphicon-download-alt"></span>
            {' '}Backup {results.length} docs
          </button>
        )}
        {backupInProgress && backupProgress && (
          <div className="progress" style={{marginTop: '0.5em', marginBottom: '0.5em'}}>
            <div className="progress-bar progress-bar-striped active"
              style={{width: `${Math.round(100 * backupProgress.completed / backupProgress.total)}%`}}
            >
              {backupProgress.completed}/{backupProgress.total}
            </div>
          </div>
        )}
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
      'csvImport': 1,
      'restore': 2
    };

    this.TAB_LABELS = [
      'Create New Document',
      'Import CSV File',
      'Restore Backup'
    ];

    this.state = {
      activeTab: this.TABS.newDoc,
      newDocId: '',
      newDocJson: '',
      csvError: null,
      csvResult: null,
      csvErrors: [],
      csvWarnings: defaultWarnings(),
      restoreData: null,
      restoreError: null,
      restoreSkipExisting: true
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

  readRestoreFile (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.error) {
        this.setState({restoreError: reader.error, restoreData: null});
        return;
      }

      try {
        const parsed = JSON.parse(reader.result);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Backup file must contain a JSON object with document IDs as keys');
        }
        this.setState({restoreError: null, restoreData: parsed});
      } catch (e) {
        this.setState({restoreError: e, restoreData: null});
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  onRestore () {
    const {onCreate} = this.props;
    const {restoreData, restoreSkipExisting} = this.state;
    const {error, success} = utils.xhrMessages({
      errorTitle: 'Failed to Restore',
      successTitle: 'Restore Succeeded'
    });

    const doRestore = (documentsToRestore) => {
      const count = Object.keys(documentsToRestore).length;
      if (count === 0) {
        swal('Nothing to Restore', 'All documents in the backup already exist.', 'info');
        return;
      }

      docs.batchInsert(documentsToRestore, (err) => {
        if (err) return error(err);
        success(`${count} document(s) restored`);
        this.refs['restore-file-input'].value = null;
        this.setState({restoreData: null, restoreError: null}, onCreate);
      });
    };

    if (restoreSkipExisting) {
      docs.list((listErr, res, existingIds) => {
        if (listErr) return error(listErr);

        const existingSet = {};
        existingIds.forEach(id => { existingSet[id] = true; });
        const filtered = {};
        Object.keys(restoreData).forEach(id => {
          if (!existingSet[id]) {
            filtered[id] = restoreData[id];
          }
        });
        doRestore(filtered);
      });
    } else {
      doRestore(restoreData);
    }
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

    case this.TABS.restore: {
      const {restoreError, restoreData, restoreSkipExisting} = this.state;

      const errorMessage = restoreError && (
        <Debug.pre data={restoreError.message || restoreError} />
      );

      const preview = restoreData && (() => {
        const ids = Object.keys(restoreData);
        return (
          <div style={{marginTop: '1em'}}>
            <p>
              Backup contains <strong>{ids.length} document(s)</strong>:
            </p>
            <div style={{maxHeight: '10em', overflow: 'auto', border: '1px solid #e7e7e7', padding: '.3em .5em'}}>
              {ids.sort().map(id => <div key={id}>{id}</div>)}
            </div>
          </div>
        );
      })();

      const controls = restoreData && (
        <div style={{marginTop: '1em'}}>
          <label>
            <input type="checkbox"
              checked={restoreSkipExisting}
              onChange={e => this.setState({restoreSkipExisting: e.target.checked})}
            />
            {' '}Skip existing documents (do not overwrite)
          </label>
          <br />
          <button className="btn btn-primary" role="button"
            style={{marginTop: '0.5em'}}
            onClick={() => this.onRestore()}
          >
            Restore
          </button>
        </div>
      );

      return (
        <div>
          <h3>Restore from Backup</h3>
          <input type="file"
            accept=".json"
            ref="restore-file-input"
            onChange={event => {
              const file = event.target.files[0];
              if (file) this.readRestoreFile(file);
            }}
          />
          {errorMessage}
          {preview}
          {controls}
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
