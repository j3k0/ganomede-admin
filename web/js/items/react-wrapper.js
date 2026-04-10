'use strict';

var React = require('react');
var swal = require('sweetalert');
var ItemModel = require('./models/itemModel');
var ItemsCollection = require('./models/itemsCollection');
var CostsTable = require('./CostsTable.jsx');
var CollectionLoader = require('../components/CollectionLoader.jsx');
var utils = require('../utils');
var backupRestore = require('../backup-restore');
require('react.backbone');

var ItemComponent = React.createBackboneClass({
  onSave: function () {
    var item = this.getModel();
    var creatingNewItem = item.isNew();
    var attrs = {
      id: item.id || item.get('displayId'),
      costs: this.refs.costs.getCosts()
    };

    utils.saveModel(
      item,
      attrs,
      {method: creatingNewItem ? 'POST' : 'PUT'},
      { success: 'Item saved!',
        error: 'Failed to save Item' },
      function (failed) {
        // In case we failed to create new item,
        // unset its id, so we will "create" it again,
        // and not "update" on subsequent "Save" clicks.
        if (failed && creatingNewItem)
          item.unset('id');
      }
    );
  },

  render: function ItemComponent () {
    var item = this.getModel();
    var displayId = item.get('id') || item.get('displayId');

    return (
      <div className="list-item">
        <div className="item-id">{displayId}</div>
        <CostsTable ref='costs'
          availableCurrencies={this.props.availableCurrencies}
          initialCosts={item.get('costs')}
        />

        <button className="btn btn-xs btn-default" onClick={this.onSave}>
          Save Item
        </button>
      </div>
    );
  }
});

var ItemsListComponent = React.createBackboneClass({
  // Rerender on this collection events.
  changeOptions: 'add remove reset',

  onAddItem: function () {
    swal({
      title: 'Adding New Item',
      text: 'Provide an ID for the item:',
      type: 'input',
      showCancelButton: true
    }, function (displayId) {
      // We need displayId so isNew() will return true and model
      // will be save and not updated. But we also need to
      // display something in the view, so put it into displayId attr.
      if (!displayId)
        return;

      this.getCollection().push(new ItemModel({
        displayId: displayId
      }));
    }.bind(this));
  },

  getBackupData: function () {
    var collection = this.getCollection();
    return collection.map(function (item) {
      return {id: item.get('id'), costs: item.get('costs')};
    });
  },

  validateRestore: function (data) {
    if (!Array.isArray(data)) return 'Backup file must contain a JSON array of items';
    for (var i = 0; i < data.length; i++) {
      if (!data[i].id) return 'Item at index ' + i + ' is missing an id';
      if (!data[i].costs || typeof data[i].costs !== 'object') return 'Item at index ' + i + ' is missing costs';
    }
    return null;
  },

  onRestore: function (data, onProgress, callback) {
    var collection = this.getCollection();

    backupRestore.restoreItems(data, function (item, cb) {
      var body = {id: item.id, costs: item.costs};
      var itemUrl = utils.apiPath('/items/' + encodeURIComponent(item.id));
      // Try POST (create) first, fall back to PUT (update) if item exists
      utils.xhr({method: 'POST', url: itemUrl, body: body}, function (err, res) {
        if (!err && res.statusCode >= 200 && res.statusCode <= 299) return cb(null);
        utils.xhr({method: 'PUT', url: itemUrl, body: body}, function (err2, res2, body2) {
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
    return 'Restore ' + data.length + ' item(s)?';
  },

  render: function ItemsListComponent () {
    var collection = this.getCollection();
    var self = this;
    var itemsList = collection.map(function (item, idx) {
      var key = [idx, item.id].join(':');

      return (
        <div className="list-item-container" key={key}>
          <ItemComponent model={item} availableCurrencies={collection.currencies} />
        </div>
      );
    });

    return (
      <div>
        <backupRestore.BackupRestoreButtons
          backupData={self.getBackupData}
          backupFilename="items-backup"
          onRestore={self.onRestore}
          validateRestore={self.validateRestore}
          restorePreview={self.restorePreview}
          onRestoreComplete={function () { collection.fetch(); }}
        />
        {itemsList}
        <button className="btn btn-primary btn-add-item" onClick={this.onAddItem}>Add New Item</button>
      </div>
    );
  }
});

module.exports = function ItemsContainer () {
  return (
    <CollectionLoader
      collection={ItemsCollection.singleton()}
      component={ItemsListComponent}
    />
  );
};
