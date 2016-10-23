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
  }

  initCodeMirror (node) {
    this.editor = codemirror(node);
    this.val(this.props.json);
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.json !== nextProps.json)
      this.val(nextProps.json);
  }

  val (newVal) {
    return (arguments.length === 1)
      ? this.editor.setValue(newVal)
      : this.editor.getValue();
  }

  render () {
    return (
      <div ref={node => this.initCodeMirror(node)}></div>
    );
  }
}

module.exports = JsonEditor;
