'use strict';

const expect = require('expect.js');
const helpers = require('./helpers');

const kUsername = 'jeko';

describe('Users', function () {
  const balanceSorter = (l, r) => l.currency < r.currency ? -1 : 1;

  it('balance()', function (done) {
    // mock.balanceOf(kUsername);
    helpers.balance(kUsername, (err, balance) => {
      expect(err).to.be(null);
      expect(balance.sort(balanceSorter)).to.be.eql([
        {currency: 'gold', count: 0},
        {currency: 'silver', count: 0},
        {currency: 'copper', count: 0}
      ].sort(balanceSorter));
      done();
    });
  });

  it('transactions()', function (done) {
    helpers.transactions(kUsername, (err, transactions) => {
      expect(err).to.be(null);
      expect(transactions).to.be.an(Array);
      done();
    });
  });

  it('avatar()', function (done) {
    helpers.avatars(kUsername, (err, dataUri) => {
      expect(err).to.be(null);
      expect(dataUri).to.match(/^data:image\/png;base64,.+/);
      done();
    });
  });

  it('metadata()', function (done) {
    helpers.metadata(kUsername, (err, data) => {
      expect(err).to.be(null);
      expect(data).to.eql({location: 'Beirut'});
      done();
    });
  });
});
