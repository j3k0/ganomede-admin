'use strict';

var React = require('react');
var ArrayView = require('./ArrayView.jsx');

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
    <tr>
      <td>
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
      </td>

      <td>
        <input
          type='text'
          value={props.amount}
          onChange={function (event) {
            props.onChange({
              currency: props.currency,
              amount: parseInt(event.target.value, 10) || 0,
              availableCurrencies: props.availableCurrencies
            });
          }}
        />
      </td>

      <td>
        <button onClick={props.onRemove}>Remove</button>
      </td>
    </tr>
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
    return (
      <div>
        <table className="table">
          <ArrayView ref="arrayView"
            initialItems={this.state.costs}
            Container='tbody'
            Component={CostsTableRow} />
        </table>
        <button onClick={event => this.refs.arrayView.onAdd({availableCurrencies: this.props.availableCurrencies})}>
          Add new
        </button>
      </div>
    );
  }
});

module.exports = CostsTable;
