'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var ItemModel = require('./models/itemModel');
var ItemsCollection = require('./models/itemsCollection');
var CostsTable = require('./CostsTable.jsx');
require('react.backbone');

var ItemComponent = React.createBackboneClass({
  onSave: function () {
    var item = this.getModel();
    var creatingNewItem = item.isNew();
    var attrs = {
      id: item.id || item.get('displayId'),
      costs: this.refs.costs.getCosts()
    };

    item.save(attrs, {
      method: creatingNewItem ? 'POST' : 'PUT',
      success: window.swal.bind(null, 'Item saved!', null, 'success'),
      error: function (model, response, options) {
        var error = options.xhr.responseJSON;
        var isUpstream = error && error.name === 'UpstreamError';
        var errorText = isUpstream
          ? error.reason
          : (options.xhr.responseJSON || options.xhr.responseText);

        var errorTitle = isUpstream
          ? error.message
          : 'Server Error';

        var body = $('<div>')
          .append($('<div>').text(errorTitle))
          .append('<br/>')
          .append($('<pre class="well">').css('text-align', 'left').text(JSON.stringify(errorText, null, 2)))
          .html();

        // In case we failed to create new item,
        // unset its id, so we will "create" it again,
        // and not "update" on subsequent "Save" clicks.
        if (creatingNewItem)
          item.unset('id');

        swal({
          type: 'error',
          title: 'Failed to Save Item',
          text: '<div>' + body + '</div>',
          html: true
        });
      }
    });
  },

  render: function () {
    var item = this.getModel();
    var displayId = item.get('id') || item.get('displayId');

    return (
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">{displayId}</h3>
        </div>

        <div className="panel-body">
          <CostsTable ref='costs'
                      availableCurrencies={this.props.availableCurrencies}
                      initialCosts={item.get('costs')}
          />

          <button className="btn btn-default" onClick={this.onSave}>
            Save changes
          </button>
        </div>
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
        <ItemComponent key={key}
          model={item}
          availableCurrencies={collection.currencies}
        />
      );
    });

    return (
      <div>
        {itemsList}
        <button onClick={this.onAddItem}>Add new Item</button>
      </div>
    );
  }
});

var ItemsListView = React.createFactory(ItemsListComponent);

module.exports = function ItemsList (/*props*/) {
  var collection = ItemsCollection.singleton();
  collection.fetch({reset: true});
  return ItemsListView({collection: collection});
};
