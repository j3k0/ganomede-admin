'use strict';

var React = require('react');

function Loader (props) {
  var content = props.error
    ? ( <div>
          Error occured. Please refresh a page and try again.
          <pre className="well">{
            [ props.error.message,
              JSON.stringify(props.error, null, 2)
            ].join('\n\n')
          }</pre>
        </div>
      )
    : props.children;

  return (
    <div>
      { props.loading ? 'Loading…' : content }
    </div>
  );
};

module.exports = Loader;
