'use strict';

var React = require('react');
var swal = require('sweetalert');
var utils = require('./utils');

var downloadJson = function (data, filename) {
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], {type: 'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

var readJsonFile = function (file, callback) {
  var reader = new FileReader();
  reader.onloadend = function () {
    if (reader.error) {
      return callback(reader.error);
    }
    try {
      var parsed = JSON.parse(reader.result);
      callback(null, parsed);
    } catch (e) {
      callback(e);
    }
  };
  reader.readAsText(file, 'UTF-8');
};

// Restore items one by one via POST/PUT.
// saveOne(item, callback) should save a single item, calling callback(err) when done.
var restoreItems = function (items, saveOne, onProgress, callback) {
  var completed = 0;
  var errors = [];
  var BATCH_SIZE = 5;

  var processOne = function (item, cb) {
    saveOne(item, function (err) {
      completed++;
      if (err) errors.push({item: item, error: err});
      onProgress({completed: completed, total: items.length, failed: errors.length});
      cb();
    });
  };

  var processBatch = function (startIndex) {
    if (startIndex >= items.length) {
      return callback(null, errors);
    }

    var batch = items.slice(startIndex, startIndex + BATCH_SIZE);
    var batchDone = 0;

    batch.forEach(function (item) {
      processOne(item, function () {
        batchDone++;
        if (batchDone === batch.length) {
          processBatch(startIndex + BATCH_SIZE);
        }
      });
    });
  };

  processBatch(0);
};

// BackupRestoreButtons component
// Props:
//   - backupData: function() returning the data to backup (called on click)
//   - backupFilename: string for the download filename
//   - onRestore: function(data, callback) to restore from parsed JSON
//   - validateRestore: function(data) returning null or error string
var BackupRestoreButtons = React.createClass({
  getInitialState: function () {
    return {
      restoreData: null,
      restoreError: null,
      restoreInProgress: false,
      restoreProgress: null
    };
  },

  onBackup: function () {
    var data = this.props.backupData();
    if (!data) return;
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    var filename = this.props.backupFilename + '-' + timestamp + '.json';
    downloadJson(data, filename);
    swal('Backup Complete', 'Downloaded ' + filename, 'success');
  },

  onFileSelected: function (event) {
    var file = event.target.files[0];
    if (!file) return;

    var self = this;
    readJsonFile(file, function (err, data) {
      if (err) {
        self.setState({restoreError: err.message, restoreData: null});
        return;
      }

      if (self.props.validateRestore) {
        var validationError = self.props.validateRestore(data);
        if (validationError) {
          self.setState({restoreError: validationError, restoreData: null});
          return;
        }
      }

      self.setState({restoreError: null, restoreData: data});
    });
  },

  onRestore: function () {
    var self = this;
    var data = this.state.restoreData;

    this.setState({restoreInProgress: true, restoreProgress: null});

    this.props.onRestore(data, function (progress) {
      self.setState({restoreProgress: progress});
    }, function (err, errors) {
      self.setState({restoreInProgress: false, restoreProgress: null});

      if (err) {
        swal('Restore Failed', err.message || String(err), 'error');
        return;
      }

      if (errors && errors.length > 0) {
        swal('Restore Complete', errors.length + ' item(s) failed to restore.', 'warning');
      } else {
        swal('Restore Complete', 'All items restored successfully.', 'success');
      }

      self.refs['restore-file-input'].value = null;
      self.setState({restoreData: null, restoreError: null});

      if (self.props.onRestoreComplete) {
        self.props.onRestoreComplete();
      }
    });
  },

  renderProgress: function () {
    var progress = this.state.restoreProgress;
    if (!progress) return null;
    var pct = Math.round(100 * progress.completed / progress.total);

    return (
      <div className="progress" style={{marginTop: '0.5em', marginBottom: '0.5em', maxWidth: '300px'}}>
        <div className="progress-bar progress-bar-striped active"
          style={{width: pct + '%'}}
        >
          {progress.completed}/{progress.total}
        </div>
      </div>
    );
  },

  render: function () {
    var state = this.state;

    return (
      <div style={{marginBottom: '1em', padding: '0.5em', border: '1px solid #e7e7e7', borderRadius: '4px'}}>
        <button className="btn btn-default btn-sm"
          onClick={this.onBackup}
          style={{marginRight: '1em'}}
        >
          <span className="glyphicon glyphicon-download-alt"></span>
          {' '}Backup
        </button>

        <label className="btn btn-default btn-sm" style={{marginRight: '0.5em', marginBottom: 0}}>
          <span className="glyphicon glyphicon-upload"></span>
          {' '}Restore…
          <input type="file" accept=".json"
            ref="restore-file-input"
            style={{display: 'none'}}
            onChange={this.onFileSelected}
          />
        </label>

        {state.restoreError && (
          <div className="alert alert-danger" style={{marginTop: '0.5em'}}>
            {state.restoreError}
          </div>
        )}

        {state.restoreData && !state.restoreInProgress && (
          <div style={{marginTop: '0.5em'}}>
            <span>{this.props.restorePreview(state.restoreData)}</span>
            {' '}
            <button className="btn btn-primary btn-sm"
              onClick={this.onRestore}
            >
              Restore
            </button>
          </div>
        )}

        {state.restoreInProgress && this.renderProgress()}
      </div>
    );
  }
});

module.exports = {
  downloadJson: downloadJson,
  readJsonFile: readJsonFile,
  restoreItems: restoreItems,
  BackupRestoreButtons: BackupRestoreButtons
};
