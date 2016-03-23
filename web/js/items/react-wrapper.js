'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var ReactBackbone = require('react.backbone');
var ItemModel = require('./models/itemModel');

var ItemComponent = React.createBackboneClass({
  onSave: function () {
    var item = this.getModel();
    var attrs = JSON.parse(this.refs.textarea.value);
    item.save(attrs, {method: item.isNew() ? 'POST' : 'PUT'});
  },

  render: function () {
    return (
      <div>
        <textarea
          ref="textarea"
          className="form-control"
          rows="8"
          defaultValue={JSON.stringify(this.getModel().toJSON(), null, 2)}
        />
        <button onClick={this.onSave}>Save changes</button>
      </div>
    );
  }
});

var ItemsListComponent = React.createBackboneClass({
  // Rerender on this collection events.
  changeOptions: 'add remove reset',

  onAddItem: function () {
    this.getCollection().push(new ItemModel());
  },

  render: function () {
    var itemsList = this.getCollection().map(function (item, idx) {
      var key = [idx, item.id].join(':');
      return (<ItemComponent key={key} model={item} />);
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

module.exports = Backbone.View.extend({
  render: function () {
    ReactDOM.render(ItemsListView({collection: this.collection}), this.el);
    return this;
  },

  destroy: function () {
    if (this.el)
      ReactDOM.unmountComponentAtNode(this.el);
  }
});
