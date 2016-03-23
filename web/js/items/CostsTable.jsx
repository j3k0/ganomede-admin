'use strict';

var React = require('react');
var ArrayView = require('./ArrayView.jsx');

var CostsTableCell = function (props) {
  // return (
  //   <td>
  //     { props.editable
  //         ? <input type='text'
  //                  value={props.value}
  //                  placeholder={props.placeholder}
  //                  onChange={function (event) {
  //                    props.onChange(event.target.value);
  //                  }}
  //           />
  //         : props.value
  //     }
  //   </td>
  // );

  return (
    <td>
    <input type='text' value={props.value} onChange={function (event) {props.onChange(event.target.value)}} />
    </td>
  );
};

var CostsTableRow = function (props) {
  return (
    <tr>
      <CostsTableCell placeholder='Currency' value={props.currency}
                    editable={props.editable}
                    onChange={function (newCurrency) {
                      props.onChange({
                        currency: newCurrency,
                        amount: props.amount
                      });
                    }}
      />
      <CostsTableCell placeholder='Amount' value={props.amount}
                    editable={props.editable}
                    onChange={function (newAmount) {
                      props.onChange({
                        currency: props.currency,
                        amount: parseInt(newAmount, 10) || 0
                      });
                    }}
      />
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
          amount: costs[currency]
        }
      }),
      editing: false
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
        <button onClick={event => this.refs.arrayView.onAdd({})}>
          Add new
        </button>
      </div>
    );
  }
});

module.exports = CostsTable;
