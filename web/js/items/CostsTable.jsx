'use strict';

var React = require('react');
var ArrayView = require('../components/ArrayView.jsx');

var CurrencySelector = function (props) {
  var options = props.availableCurrencies.map(function (currency) {
    return (
      <option key={currency}
        value={currency}>{currency}
      </option>
    );
  });

  return (
    <select
      value={props.selectedCurrency}
      onChange={event => props.onChange(event.target.value)}
    >
      {options}
    </select>
  );
};

var CostsTableRow = function (props) {
  return (
    <div className="item-cost">
      <CurrencySelector
        selectedCurrency={props.currency}
        availableCurrencies={props.availableCurrencies}
        onChange={function (newCurrency) {
          props.onChange({
            currency: newCurrency,
            amount: props.amount,
            availableCurrencies: props.availableCurrencies
          });
        }}
      />

      <input
        type='text'
        size='5'
        value={props.amount}
        onChange={function (event) {
          props.onChange({
            currency: props.currency,
            amount: parseInt(event.target.value, 10) || 0,
            availableCurrencies: props.availableCurrencies
          });
        }}
      />
    </div>
  );
};

var CostsTable = React.createClass({
  getInitialState: function () {
    var costs = this.props.initialCosts || {};

    return {
      costs: Object.keys(costs).map(function (currency) {
        return {
          currency: currency,
          amount: costs[currency],
          availableCurrencies: this.props.availableCurrencies
        }
      }, this)
    }
  },

  getCosts: function () {
    return this.refs.arrayView.getItems().reduce(function (costs, cost) {
      costs[cost.currency] = cost.amount;
      return costs;
    }, {});
  },

  render: function () {
    var addButton = '';
    if (this.state.costs.length < 1) {
      addButton = (
        <button className="btn btn-xs btn-primary" onClick={event => {
          event.target.style.display = 'none';
          this.refs.arrayView.onAdd({
            currency: this.props.availableCurrencies[0],
            amount: 0,
            availableCurrencies: this.props.availableCurrencies
          });
        }}>
          Add Cost
        </button>
      );
    }

    return (
      <div className="item-costs">
        <ArrayView ref="arrayView"
          initialItems={this.state.costs}
          Container='div'
          Component={CostsTableRow} />
        {addButton}
      </div>
    );
  }
});

module.exports = CostsTable;
