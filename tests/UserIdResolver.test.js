'use strict';

const UserIdResolver = require('../server/users/UserIdResolver');
const {Lookups} = UserIdResolver;

describe('UserIdResolver', async () => {
  describe('#performLookups()', () => {
    it('returns lookups fetched using directory client', async () => {
      const directory = td.object(['byId', 'byAlias']);
      const resolver = new UserIdResolver(directory);

      td.when(directory.byId({id: 'alice'}, td.callback))
        .thenCallback(null, {id: 'id-result'});

      td.when(directory.byAlias({type: 'tag', value: 'aiice'}, td.callback))
        .thenCallback(null, {id: 'tag-result'});

      const lookups = await resolver.performLookups('alice');

      expect(lookups).to.be.instanceof(Lookups);
      expect(lookups).to.eql({
        query: 'alice',
        results: [
          {found: true, method: 'byId', args: [{id: 'alice'}], userId: 'id-result'},
          {found: true, method: 'byAlias', args: [{type: 'tag', value: 'aiice'}], userId: 'tag-result'}
        ],
        matchingIds: ['id-result', 'tag-result']
      });
    });

    it('lookups that return 404 are okay', async () => {
      const directory = td.object(['byId', 'byAlias']);
      const resolver = new UserIdResolver(directory);

      td.when(directory.byId({id: 'alice'}, td.callback))
        .thenCallback(Object.assign(new Error('HTTP404'), {statusCode: 404}));

      td.when(directory.byAlias({type: 'tag', value: 'aiice'}, td.callback))
        .thenCallback(null, {id: 'tag-result'});

      await resolver.performLookups('alice');
    });

    // TODO
    // could be that for 1st call server is down, but back up again for 2nd.
    // W/ever, ignore it for now, just fail.
    it('failing lookups rethrow error', async () => {
      const directory = td.object(['byId', 'byAlias']);
      const resolver = new UserIdResolver(directory);

      td.when(directory.byId({id: 'alice'}, td.callback))
        .thenCallback(new Error('Something not good'));

      td.when(directory.byAlias({type: 'tag', value: 'aiice'}, td.callback))
        .thenCallback(null, {id: 'tag-result'});

      try {
        await resolver.performLookups('alice');
        assert(false, 'Error was not rethrown');
      }
      catch (ex) {
        expect(ex).to.be.instanceof(Error);
        expect(ex.message).to.equal('Something not good');
      }
    });
  });
});
