'use strict';

const nock = require('nock');
const expect = require('expect.js');
const helpers = require('./helpers');
const upstreams = require('../upstreams');
const config = require('../../config');

describe('Users', function () {
  const mock = {
    balanceOf: (username) => {
      nock(upstreams.virtualcurrency.prefix)
        .get(`/auth/${process.env.API_SECRET}/coins/${config.services.virtualcurrency.currencies.join(',')}/count/${username}`)
        .reply(200, [
          {currency: 'gold', count: 1},
          {currency: 'silver', count: 5}
        ]);
    }
  };

  it('balance()', function (done) {
    mock.balanceOf('elmigranto');
    helpers.balance('elmigranto', (err, balance) => {
      expect(err).to.be(null);
      expect(balance).to.be.eql([
        {currency: 'gold', count: 1},
        {currency: 'silver', count: 5}
      ]);
      done();
    });
  });
});
