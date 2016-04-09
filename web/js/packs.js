'use strict';

var backbone = require('backbone');
var React = require('react');
var CollectionLoader = require('./components/CollectionLoader.jsx');
require('react.backbone');

var packs = (function () {
  var Packs = backbone.Collection.extend({
    url: '../api/packs'
  });

  return new Packs();
}());

var Pack = React.createBackboneClass({
  changeOptions: 'change:amount',

  onSave: function () {
    var changes = {
      amount: parseInt(this.refs.amountInput.value, 10) || 0
    };

    this.getModel().save(changes, {
      success: function () {
        alert('succeeded');
      },

      error: function () {
        alert('failed');
      }
    })
  },

  render: function () {
    var pack = this.getModel();

    return (
      <div className="row">
        <div className="col-md-3">{pack.get('id')}</div>
        <div className="col-md-3">{pack.get('currency')}</div>
        <div className="col-md-6">
          <input
            type='text'
            size='5'
            ref='amountInput'
            defaultValue={pack.get('amount')}
          />

          <button className="btn btn-xs btn-default" onClick={this.onSave}>
            Update Amount
          </button>
        </div>
      </div>
    );
  }
});

function PacksList (props) {
  var packs = props.collection.map(function (pack) {
    return (
      <Pack key={pack.id} model={pack} />
    );
  });

  return (<div>{packs}</div>);
}

module.exports = function () {
  return (
    <CollectionLoader
      collection={packs}
      component={PacksList}
    />
  );
};

