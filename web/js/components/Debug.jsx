'use strict';

const util = require('util');
const React = require('react');

function Debug (props) {
  return (
    <div className="debug">
      {props.children}
    </div>
  );
}

Debug.pre = function pre (props) {
  const {data} = props;
  const text = typeof data === 'string'
    ? data
    : util.inspect(data, {depth: null});

  return (
    <Debug>
      <pre className="well">
        {text}
      </pre>
    </Debug>
  );
};

module.exports = Debug;
