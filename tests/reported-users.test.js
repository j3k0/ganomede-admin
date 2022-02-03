'use strict';

const {
  assert
} = require('chai');
const Helper = require('../server/users/helpers');
const router = require('../server/users/index');


describe('reported-users', async () => {
  describe('#highlyReportedUsers()', () => {
    it('returns json of the most reported users', (done) => {

      const helper = td.object(Helper);
      const response = [{ target: 'user1', total: 10 }];

      td.when(helper.highlyReportedUsers(td.callback))
        .thenCallback(null, response);

      const res = td.object(['json']);
      const req = {
        params: {
        }
      };
      const next = function (err) {
        try {
          assert(err == undefined, 'there should not be an error');
          td.verify(res.json(response));
          done();
        } catch (e) {
          done(e);
        }
      };
      router.listHighlyReportedUsers(helper)(req, res, next);
    });


  });
});