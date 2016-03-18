'use strict';

var React = require('react');
var ReactDOM = require('react-dom');

var Item = React.createClass({
  getInitialState: function () {
    return this.props.model.toJSON();
  },

  onSave: function () {
    var json = this.refs.textarea.value;
    var obj = JSON.parse(json);
    this.setState(obj);
    this.props.model.set(obj);
    this.props.model.save()
  },

  render: function () {
    return (
      <div>
        <textarea
          ref="textarea"
          className="form-control"
          rows="8"
          defaultValue={JSON.stringify(this.state, null, 2)}
        />
        <button onClick={this.onSave}>Save changes</button>
      </div>
    );
  }
});

var Items = React.createClass({
  render: function () {
    return (
      <div>
        { this.props.collection.map(function (model) {
            return (<Item key={model.id} model={model} />);
          })
        }
      </div>
    );
  }
});

module.exports = Backbone.View.extend({
  initialize: function () {
    // FIXME
    // For some reason addnig `reset` here
    // results in creation of multiple React Nodes.
    // If we remove `reset`, initial re-render does not happen
    // (the one router initiates by collection.fetch({reset: true})).
    this.collection.bind("add change remove reset", this.render, this);
  },

  render: function () {
    ReactDOM.render(<Items collection={this.collection} />, this.el);
    return this;
  },

  destroy: function () {
    if (this.el)
      ReactDOM.unmountComponentAtNode(this.el);
  }
});
