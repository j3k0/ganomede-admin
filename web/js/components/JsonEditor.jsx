'use strict';

const React = require('React');
const CodeMirror = require('codemirror');

// Require modes, addons, etc. for side-effects.
require('codemirror/mode/javascript/javascript');
require('codemirror/addon/selection/active-line');
require('codemirror/addon/fold/foldgutter');
require('codemirror/addon/fold/brace-fold');
require('codemirror/addon/dialog/dialog');
require('codemirror/addon/search/searchcursor');
require('codemirror/addon/search/search');

// Creates editor in a given DOMNode.
const codemirror = (node) => CodeMirror(node, {
  mode: 'application/json',
  lineNumbers: true,
  styleActiveLine: true,
  foldGutter: {
    rangeFinder: CodeMirror.fold.brace
  },
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
});

class JsonEditor extends React.Component {
  constructor (props) {
    super(props);
    this.editor = null; // CodeMirror Instance
    this.editorNode = null; // Where to render stuff.
  }

  componentDidMount () {
    this.editor = codemirror(this.editorNode);
    this.val(this.props.json);
    if (this.props.onChange)
      this.editor.on('change', this.handleChange.bind(this));
  }

  componentDidUpdate () {
    if (this.val() !== this.props.json)
      this.val(this.props.json);
  }

  handleChange () {
    this.props.onChange(this.val());
  }

  val (newVal) {
    return (arguments.length === 1)
      ? this.editor.setValue(newVal)
      : this.editor.getValue();
  }

  render () {
    return (
      <div ref={node => this.editorNode = node}></div>
    );
  }
}

module.exports = JsonEditor;
