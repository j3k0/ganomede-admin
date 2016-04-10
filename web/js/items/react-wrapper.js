'use strict';

var React = require('react');
var ItemModel = require('./models/itemModel');
var ItemsCollection = require('./models/itemsCollection');
var CostsTable = require('./CostsTable.jsx');
var CollectionLoader = require('../components/CollectionLoader.jsx');
var utils = require('../utils');
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

  render: function () {
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

  render: function () {
    var collection = this.getCollection();
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
        {itemsList}
        <button className="btn btn-primary btn-add-item" onClick={this.onAddItem}>Add New Item</button>
      </div>
    );
  }
});

module.exports = function () {
  return (
    <CollectionLoader
      collection={ItemsCollection.singleton()}
      component={ItemsListComponent}
    />
  );
};
