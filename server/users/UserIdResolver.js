'use strict';

const assert = require('assert');
const {tag: toTag} = require('ganomede-tagizer');
const {createClient: createDirectoryClient} = require('ganomede-directory');
const {awaitable} = require('awaitability');
const {GanomedeError} = require('ganomede-errors');
const upstreams = require('../upstreams');
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
    this.matchingIds = this.results.filter(r => r.found).map(r => r.userId);
  }

  hasSingleMatch () {
    return this.matchingIds.length === 1;
  }

  hasMultipleMatches () {
    return this.matchingIds.length > 1;
  }

  firstMatch () {
    return this.matchingIds[0];
  }
}

class UserIdNotFoundError extends GanomedeError {
  constructor (query) {
    super('UserID `%s` not found', query);
  }
}

class UserIdResolver {
  constructor (directoryClient = createDirectoryClient()) {
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
      // We are okay with restify's 404 errors.
      if (ex instanceof Error && (ex.statusCode === 404))
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


  resolve (query) {
    if (!upstreams.directory)
      throw new Error('directory service is not configured');

    return this.performLookups(query);
  }
}

Object.assign(
  UserIdResolver,
  {LookupResult, Lookups, UserIdNotFoundError}
);

module.exports = UserIdResolver;
