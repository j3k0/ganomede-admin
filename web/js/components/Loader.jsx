'use strict';

const React = require('react');
const {prettyPrintError} = require('../utils');

function Loader (props) {
  var {error, children, loading} = props;

  var content = error
    ? ( <div>
          Error occured. Please refresh a page and try again.
      <pre className="well">{
        [ error.message || '<no error message || not an Error instance >',
          prettyPrintError(error)
        ].join('\n\n')
      }</pre>
    </div>
    )
    : children;

  return (
    <div data-loading={loading}>
      { loading ? 'Loading…' : content }
    </div>
  );
}

module.exports = Loader;
