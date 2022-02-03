'use strict';

const {
  assert
} = require('chai');
const Helper = require('../server/users/helpers');
const router = require('../server/users/index');


describe('usermetas', async () => {
  describe('#dynamicMetadata()', () => {
    it('returns user metas based on a test user', (done) => {
      const userId = 'test1';
      const metadataList = ['usermeta1', 'usermeta2'];
      const helper = td.object(Helper);
      const response = [{
        id: "usermeta1",
        value: ""
      }, {
        id: "usermeta2",
        value: ""
      }];

      td.when(helper.dynamicMetadata(userId, metadataList.join(','), td.callback))
        .thenCallback(null, response);

      const res = td.object(['json']);
      const req = {
        params: {
          username: userId
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
      router.getUsermetaMiddleware(helper, metadataList.join(','))(req, res, next);
    });

    it('checking metadatalist emtpy', (done) => {
      const userId = 'test1';
      const metadataList = [];
      const helper = td.object(Helper);
      const response = [{
        id: "",
        value: ""
      }];

      td.when(helper.dynamicMetadata(userId, metadataList.join(','), td.callback))
        .thenCallback(null, response);

      const res = td.object(['json']);
      const req = {
        params: {
          username: userId
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
      router.getUsermetaMiddleware(helper, metadataList.join(','))(req, res, next);
    });

    it('Updating metadata', (done) => {
      const userId = 'test1'; 
      const metaKey = 'usermeta1';
      const metaVal = 'from-tests';
      const helper = td.object(Helper);
      const response = {};

      td.when(helper.updateDynamicUserMeta(td.matchers.anything(), td.matchers.anything(), td.matchers.anything(), td.callback))
        .thenCallback(null, response);

      const res = td.object(['json']);
      const req = {
        params: {
          username: userId, 
        },
        body: {
          id: metaKey,
          value: metaVal
        }
      };
      const next = function(err) {
        try {
          assert(err == undefined, 'there should not be an error');
          td.verify(res.json(response));
          td.verify(helper.updateDynamicUserMeta(userId, metaKey, metaVal, td.callback));
          done();
        } catch (e) {
          done(e);
        }
      };
      router.updateMetaDataMiddleWare(helper)(req, res, next);
    });

  });
});