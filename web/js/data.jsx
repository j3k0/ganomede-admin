'use strict';

const React = require('react');
const JsonEditor = require('./components/JsonEditor.jsx');
const utils = require('./utils');

const docs = {
  url (id) {
    const docIdParam = (arguments.length === 1)
      ? `/${encodeURIComponent(id)}`
      : '';

    return utils.apiPath(`/data/docs${docIdParam}`);
  },

  list (query, callback) {
    utils.xhr({
      method: 'get',
      url: this.url()
    }, callback);
  },

  search (query, callback) {
    utils.xhr({
      method: 'get',
      url: this.url(),
      qs: {q: query}
    }, callback);
  },

  fetch (id, callback) {
    utils.xhr({
      method: 'get',
      url: this.url(id),
      gzip: true
    }, callback);
  },

  replace (id, newDoc, callback) {
    utils.xhr({
      method: 'post',
      url: this.url(id),
      body: newDoc
    }, callback);
  },

  delete (id, callback) {
    utils.xhr({
      method: 'delete',
      url: this.url(id)
    }, callback);
  }
};

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
