'use strict';

var React = require('react');

const prettyPrintError = (error) => {
  const isHtml = (typeof error === 'string' && error.includes('<!DOCTYPE html>'));

  return isHtml
    ? error.replace(/(?:\\n|<br>)/g, '\n')
    : JSON.stringify(message, null, 2);
};

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
