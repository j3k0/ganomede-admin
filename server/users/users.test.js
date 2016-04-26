'use strict';

const expect = require('expect.js');
const helpers = require('./helpers');

describe('Users', function () {
  const balanceSorter = (l, r) => l.currency < r.currency ? -1 : 1;
  const kUsername = 'jeko';
  const kProfile = {};

  it('balance()', function (done) {
    // mock.balanceOf(kUsername);
    helpers.balance(kUsername, (err, balance) => {
      expect(err).to.be(null);
      expect(balance.sort(balanceSorter)).to.be.eql([
        {currency: 'gold', count: 0},
        {currency: 'silver', count: 0},
        {currency: 'copper', count: 0}
      ].sort(balanceSorter));

      kProfile.balance = balance.sort(balanceSorter);
      done();
    });
  });

  it('transactions()', function (done) {
    helpers.transactions(kUsername, (err, transactions) => {
      expect(err).to.be(null);
      expect(transactions).to.be.an(Array);

      kProfile.transactions = transactions;
      done();
    });
  });

  it('avatar()', function (done) {
    helpers.avatar(kUsername, (err, avatar) => {
      expect(err).to.be(null);
      expect(avatar).to.match(/^data:image\/png;base64,.+/);

      kProfile.avatar = avatar;
      done();
    });
  });

  it('metadata()', function (done) {
    helpers.metadata(kUsername, (err, metadata) => {
      expect(err).to.be(null);
      expect(metadata).to.eql({location: 'Beirut'});

      kProfile.metadata = metadata;
      done();
    });
  });

  it('profile()', function (done) {
    helpers.profile(kUsername, (err, profile) => {
      expect(err).to.be(null);
      expect(profile).to.eql({
        username: kUsername,
        transactions: kProfile.transactions,
        metadata: kProfile.metadata,
        avatar: kProfile.avatar,
        balance: kProfile.balance.reduce((prev, curAmount) => {
          prev[curAmount.currency] = curAmount.count;
          return prev;
        }, {})
      });
      done();
    });
  });
});
