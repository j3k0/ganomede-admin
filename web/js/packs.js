'use strict';

var backbone = require('backbone');
var React = require('react');
var CollectionLoader = require('./components/CollectionLoader.jsx');
var utils = require('./utils');
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

  render: function () {
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

function PacksList (props) {
  var packs = props.collection.map(function (pack) {
    return (
      <div className="list-item-container" key={pack.id}>
        <Pack model={pack} />
      </div>
    );
  });

  return (<div>{packs}</div>);
}

module.exports = function PacksContainer () {
  return (
    <CollectionLoader
      collection={packs}
      component={PacksList}
    />
  );
};

