'use strict';

var React = require('react');

function Loader (props) {
  var {error, children, loading} = props;

  var content = error
    ? ( <div>
          Error occured. Please refresh a page and try again.
          <pre className="well">{
            [ error.message,
              JSON.stringify(error, null, 2)
            ].join('\n\n')
          }</pre>
        </div>
      )
    : children;

  return (
    <div>
      { loading ? 'Loading…' : content }
    </div>
  );
}

module.exports = Loader;
