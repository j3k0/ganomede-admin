'use strict';

const {
  assert
} = require('chai');
const Helper = require('../server/users/helpers');
const router = require('../server/users/index');


describe('reports-blocks', async () => {
  describe('#reportsAndBlocks()', () => {
    it('returns json of the reports, blocks, blocked-by, reported-by targeting the user , from the user', (done) => {
      const userId = 'test1';  

      const helper = td.object(Helper);
      const response = { blockedBy: [], blocks: [], reportedBy: [], reports: [] };

      td.when(helper.reportsAndBlocks(td.matchers.anything(), td.callback))
        .thenCallback(null, response);

      const res = td.object(['json']);
      const req = {
        params: {
          usename: userId, 
        }
      };
      const next = function(err) {
        try {
          assert(err == undefined, 'there should not be an error');
          td.verify(res.json(response));
          done();
        } catch (e) {
          done(e);
        }
      };
      router.listReportsAndBlocks(helper)(req, res, next);
    });
 

  });
});