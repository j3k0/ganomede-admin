'use strict';

const Helper = require('../server/users/helpers');

let userId = 'test1';

describe('usermetas', async () => {
    describe('#dynamicMetadata()', () => {
      it('returns user metas based on a test user', async () => {
        const helper = td.object(Helper);  
  
        td.when(helper.dynamicMetadata(userId, 'location,locale,auth', td.callback))
          .thenCallback(null, 'test');
  
        
      });
   
   
    });
  });
  