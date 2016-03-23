'use strict';

var React = require('react');
var ReactDOM = require('react-dom');
var ReactBackbone = require('react.backbone');

var ItemComponent = React.createBackboneClass({
  onSave: function () {
    var json = this.refs.textarea.value;
    var obj = JSON.parse(json);
    this.props.model.set(obj);
    this.props.model.save();
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

  render: function () {
    var itemsList = this.getCollection().map(function (item) {
      return (<ItemComponent key={item.id} model={item} />);
    });

    return (
      <div>
        {itemsList}
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
