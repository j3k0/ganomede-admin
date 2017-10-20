'use strict';

const expectJs = require('expect.js');
const helpers = require('../server/users/helpers');

describe.skip('Users', function () {
  const balanceSorter = (l, r) => l.currency < r.currency ? -1 : 1;
  const kUsername = 'jeko';
  const kProfile = {};

  it('balance()', function (done) {
    helpers.balance(kUsername, (err, balance) => {
      expectJs(err).to.be(null);
      expectJs(balance.sort(balanceSorter)).to.be.eql([
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
      expectJs(err).to.be(null);
      expectJs(transactions).to.be.an(Array);

      kProfile.transactions = transactions;
      done();
    });
  });

  it('avatar()', function (done) {
    helpers.avatar(kUsername, (err, avatar) => {
      expectJs(err).to.be(null);
      expectJs(avatar).to.match(/^data:image\/png;base64,.+/);

      kProfile.avatar = avatar;
      done();
    });
  });

  it('metadata()', function (done) {
    helpers.metadata(kUsername, (err, metadata) => {
      expectJs(err).to.be(null);
      expectJs(metadata).to.eql({location: 'Beirut'});

      kProfile.metadata = metadata;
      done();
    });
  });

  it('profile()', function (done) {
    helpers.profile(kUsername, (err, profile) => {
      expectJs(err).to.be(null);
      expectJs(profile).to.eql({
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

  it('reward', function (done) {
    helpers.reward(kUsername, 1, 'gold', (err, transaction) => {
      expectJs(err).to.be(null);
      expectJs(transaction).to.be.ok();
      expectJs(transaction).to.have.keys('ok', 'id', 'rev');
      expectJs(transaction.ok).to.be(true);
      done();
    });
  });
});
