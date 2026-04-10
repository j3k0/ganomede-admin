'use strict';

var backbone = require('backbone');
var React = require('react');
var CollectionLoader = require('./components/CollectionLoader.jsx');
var utils = require('./utils');
var backupRestore = require('./backup-restore');
require('react.backbone');

var packs = (function () {
  var Packs = backbone.Collection.extend({
    url: utils.apiPath('/packs')
  });

  return new Packs();
}());

var Pack = React.createBackboneClass({
  changeOptions: 'change:amount',

  onSave: function () {
    utils.saveModel(
      this.getModel(),
      {amount: parseInt(this.refs.amountInput.value, 10) || 0},
      {},
      { success: 'Pack Saved',
        error: 'Failed to update Pack' }
    );
  },

  render: function Pack () {
    var pack = this.getModel();

    return (
      <div className="list-item">
        <div className="item-id">{pack.get('id')}</div>
        <div className="item-costs">
          <div className="item-cost">
            <select value={pack.get('currency')} disabled>
              <option value={pack.get('currency')}>{pack.get('currency')}</option>
            </select>

            <input
              type='text'
              size='5'
              ref='amountInput'
              defaultValue={pack.get('amount')}
            />
          </div>
        </div>
        <button className="btn btn-xs btn-default" onClick={this.onSave}>
            Update Amount
        </button>
      </div>
    );
  }
});

var PacksList = React.createClass({
  getBackupData: function () {
    return this.props.collection.map(function (pack) {
      return {id: pack.get('id'), currency: pack.get('currency'), amount: pack.get('amount')};
    });
  },

  validateRestore: function (data) {
    if (!Array.isArray(data)) return 'Backup file must contain a JSON array of packs';
    for (var i = 0; i < data.length; i++) {
      if (!data[i].id) return 'Pack at index ' + i + ' is missing an id';
      if (!data[i].currency) return 'Pack at index ' + i + ' is missing a currency';
      if (data[i].amount === undefined) return 'Pack at index ' + i + ' is missing an amount';
    }
    return null;
  },

  onRestore: function (data, onProgress, callback) {
    var collection = this.props.collection;

    backupRestore.restoreItems(data, function (pack, cb) {
      var body = {id: pack.id, currency: pack.currency, amount: pack.amount};
      var packUrl = utils.apiPath('/packs/' + encodeURIComponent(pack.id));
      // Try POST (create) first, fall back to PUT (update) if pack exists
      utils.xhr({method: 'POST', url: packUrl, body: body}, function (err, res) {
        if (!err && res.statusCode >= 200 && res.statusCode <= 299) return cb(null);
        utils.xhr({method: 'PUT', url: packUrl, body: body}, function (err2, res2, body2) {
          if (!err2 && (res2.statusCode < 200 || res2.statusCode > 299)) err2 = body2;
          cb(err2);
        });
      });
    }, onProgress, function (err, errors) {
      collection.fetch();
      callback(err, errors);
    });
  },

  restorePreview: function (data) {
    return 'Restore ' + data.length + ' pack(s)?';
  },

  render: function () {
    var self = this;
    var collection = this.props.collection;
    var packsList = collection.map(function (pack) {
      return (
        <div className="list-item-container" key={pack.id}>
          <Pack model={pack} />
        </div>
      );
    });

    return (
      <div>
        <backupRestore.BackupRestoreButtons
          backupData={self.getBackupData}
          backupFilename="packs-backup"
          onRestore={self.onRestore}
          validateRestore={self.validateRestore}
          restorePreview={self.restorePreview}
          onRestoreComplete={function () { collection.fetch(); }}
        />
        {packsList}
      </div>
    );
  }
});

module.exports = function PacksContainer () {
  return (
    <CollectionLoader
      collection={packs}
      component={PacksList}
    />
  );
};

