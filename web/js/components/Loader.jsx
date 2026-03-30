'use strict';

const React = require('react');
const {prettyPrintError} = require('../utils');

const FRIENDLY_MESSAGES = {
  401: 'Unauthorized — please log in again.',
  403: 'Forbidden — you don\'t have permission for this action.',
  404: 'Not found.',
  500: 'Internal server error.',
  502: 'Bad response from an upstream service.',
  503: 'Service unavailable — try again in a moment.',
  504: 'Request timed out — the upstream service is slow or down.',
};

function friendlyMessage(error) {
  if (!error) return 'Something went wrong.';

  var status = error.statusCode || error.status;
  if (status && FRIENDLY_MESSAGES[status]) return FRIENDLY_MESSAGES[status];

  var msg = (error.error || error.message || (typeof error === 'string' ? error : '')).toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return FRIENDLY_MESSAGES[504];
  if (msg.includes('unavailable') || msg.includes('econnrefused')) return FRIENDLY_MESSAGES[503];
  if (msg.includes('not found')) return FRIENDLY_MESSAGES[404];

  return 'Something went wrong. Please try again.';
}

function Loader (props) {
  var {error, children, loading, loadingText} = props;

  var content = error
    ? ( <div className="alert alert-danger">
          <strong>{friendlyMessage(error)}</strong>
          <details className="error-details">
            <summary>Technical details</summary>
            <pre className="well">{
              [ error.message || '<no error message>',
                prettyPrintError(error)
              ].join('\n\n')
            }</pre>
          </details>
        </div>
    )
    : children;

  return (
    <div data-loading={loading}>
      { loading ? (loadingText || 'Loading…') : content }
    </div>
  );
}

module.exports = Loader;
