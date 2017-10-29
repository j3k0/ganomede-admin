'use strict';

const td = require('testdouble');
const {assert, expect} = require('chai');

td.print = (what) => {
  const message = td.explain(what).description;
  console.log('%s', message); // eslint-disable-line no-console
};

global.td = td;
global.expect = expect;
global.assert = assert;
global._testing = true;

afterEach(() => td.reset());
