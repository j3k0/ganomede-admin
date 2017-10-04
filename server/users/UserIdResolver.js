'use strict';

const assert = require('assert');
const {tag: toTag} = require('ganomede-tagizer');
const {awaitable} = require('awaitability');
const {GanomedeError} = require('ganomede-errors');
const log = require('../log');

class LookupResult {
  constructor ({found, method, args, userId}) {
    assert((found && userId) || (!found && !userId));
    this.found = found;
    this.method = method;
    this.args = args;
    this.userId = found ? userId : null;
  }

  get missing () { return !this.found; }
}

class Lookups {
  constructor (query, results) {
    this.query = query;
    this.results = results;
  }

  firstMatch () {
    const match = this.results.find(r => r.found);

    if (!match)
      throw new UserIdNotFoundError(this.query);

    return match;
  }
}

class UserIdNotFoundError extends GanomedeError {
  constructor (query) {
    super('UserID not resolved from query `%s`', query);
  }
}

class UserIdResolver {
  constructor (directoryClient) {
    this.directory = directoryClient;
  }

  // directory returns something like
  // {id: 'alice', aliases :{name: 'Alice of The Wonderland'}}
  async lookup (method, ...args) {
    try {
      const bound = this.directory[method].bind(this.directory, ...args);
      const {id: userId} = await awaitable(bound);

      return new LookupResult({found: true, method, args, userId});
    }
    catch (ex) {
      // Directory client uses `callback(new Error("HTTP" + res.statusCode));`
      // for non-200 status codes. We are fine with 404, however.
      if (ex instanceof Error && (ex.message === 'HTTP404'))
        return new LookupResult({found: false, method, args});

      log.error('UserId resolution failed %j:\n', {method, args}, ex);
      throw ex;
    }
  }

  async performLookups (query) {
    const results = await Promise.all([
      this.lookup('byId', {id: query}),
      this.lookup('byAlias', {type: 'tag', value: toTag(query)})
    ]);

    return new Lookups(query, results);
  }


  async resolve (query) {
    const lookups = await this.performLookups(query);
    return lookups.firstMatch().userId;
  }
}

Object.assign(
  UserIdResolver,
  {LookupResult, Lookups, UserIdNotFoundError}
);

module.exports = UserIdResolver;
