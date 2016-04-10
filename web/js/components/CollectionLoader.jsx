'use strict';

var React = require('react');
var Loader = require('./Loader.jsx');

var CollectionLoader = React.createClass({
  getInitialState: function () {
    return {
      error: null,
      loading: true,
      collection: this.props.collection
    };
  },

  componentDidMount: function () {
    this.state.collection.fetch({
      reset: true,
      success: function () {
        this.setState({loading: false});
      }.bind(this),
      error: function (collection, xhr) {
        var err = new Error(xhr.responseText);
        err.reason = xhr.responseJSON;
        this.setState({
          loading: false,
          error: err
        });
      }.bind(this)
    });
  },

  render: function () {
    return (
      <Loader loading={this.state.loading} error={this.state.error}>
        <this.props.component collection={this.state.collection} />
      </Loader>
    );
  }
});

module.exports = CollectionLoader;
