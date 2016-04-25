'use strict';

var React = require('react');

function pre (props) {
  return (
    <pre className="well">
      {JSON.stringify(props.data, null, 2)}
    </pre>
  );
}

module.exports = {
  pre: pre
};
