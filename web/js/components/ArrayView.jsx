'use strict';

var React = require('react');

var ArrayView = React.createClass({
  getInitialState: function () {
    var items = (this.props.initialItems || []).slice();

    return {
      items: items
    };
  },

  getItems: function () {
    return this.state.items.slice();
  },

  onChange: function (idx, item) {
    var newItems = this.state.items.slice();
    newItems[idx] = item;
    this.setState({items: newItems});
  },

  onAdd: function (item) {
    var newItems = this.state.items.slice();
    newItems.push(item);
    this.setState({items: newItems});
  },

  onRemove: function (idx) {
    var newItems = this.state.items.slice();
    newItems.splice(idx, 1);
    this.setState({items: newItems});
  },

  render: function () {
    return (
      <this.props.Container>
        { this.state.items.map(function (item, idx) {
            return (
              <this.props.Component key={idx}
                {...item}
                onChange={this.onChange.bind(this, idx)}
                onRemove={this.onRemove.bind(this, idx)}
              />
            );
          }, this)
        }
      </this.props.Container>
    );
  }
});

module.exports = ArrayView;
