'use strict';

const {
  assert
} = require('chai');
const Helper = require('../server/users/helpers');
const router = require('../server/users/index');


describe('chatroom', async () => {
  describe('#chatRooms()', () => {
    it('returns json of the message history  between 2 persons', (done) => {
      const userId1 = 'test1';
      const userId2 = 'test1';
      const gameId = 'triominos/v1';

      const helper = td.object(Helper);
      const response = {};

      td.when(helper.chatRooms(td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.callback))
        .thenCallback(null, response);

      const res = td.object(['json']);
      const req = {
        params: {
          username1: userId1,
          username2: userId2,
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
      router.listChatHistory(helper, gameId)(req, res, next);
    });
 

  });
});