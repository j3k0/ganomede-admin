'use strict';

var React = require('react');

function Debug (props) {
  return (
    <div className="debug">
      {props.children}
    </div>
  );
}

Debug.pre = function pre (props) {
  return (
    <Debug>
      <pre className="well">
        {JSON.stringify(props.data, null, 2)}
      </pre>
    </Debug>
  );
}

module.exports = Debug;
