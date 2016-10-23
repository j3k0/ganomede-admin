'use strict';

const React = require('react');
const JsonEditor = require('./components/JsonEditor.jsx');

class Document extends React.Component {
  constructor (props) {
    super(props);
  }

  render () {
    const {docId} = this.props.params;
    const json = JSON.stringify(this.props, null, 2);

    return (
      <div>
        <h3>Document {docId}</h3>
        <button className="btn btn-primary" role="button">Save</button>
        <JsonEditor ref="editor" json={json} />
      </div>
    );
  }
}

class Layout extends React.Component {
  render () {
    return (
      <div>
        Search docs… <input />
        <div>{this.props.children}</div>
      </div>
    );
  }
}

module.exports = {
  Layout,
  Document
};
