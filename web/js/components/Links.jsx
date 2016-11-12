'use strict';

const React = require('React');
const ReactRouter = require('react-router');
const utils = require('../utils');

function Link (props) {
  return (
    <ReactRouter.Link
      {...props}
      activeClassName='active'
      to={utils.webPath(props.to)}
    />
  );
}

function NavLink (props) {
  return (
    <li className="items-menu">
      <Link {...props} />
    </li>
  );
}

module.exports = {Link, NavLink};
