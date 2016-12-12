'use strict';

const fs = require('fs');
const path = require('path');
const lodash = require('lodash');
const {expect} = require('chai');
const {parseCsv} = require('../web/js/data-csv-import');
const samples = require('./csv-import-samples');

describe('parseCsv()', () => {
  lodash.each(samples, (sample, description) => {
    const {input, shouldError, errorMessage, result} = sample;

    it(description, () => {
      const actual = parseCsv(input);

      if (shouldError) {
        expect(actual).to.be.instanceof(Error);
        errorMessage instanceof RegExp
          ? expect(actual.message).to.match(errorMessage)
          : expect(actual.message).to.equal(errorMessage);
      }
      else {
        expect(actual).not.to.be.instanceof(Error);
        expect(actual).to.eql(result);
      }
    });
  });

  describe('Github issues', () => {
    it('ganomede-data#4', () => {
      const filepath = path.join(__dirname, 'csv-import-issue-4.csv');
      const csv = fs.readFileSync(filepath, 'utf8');
      const actual = parseCsv(csv);
      const problematicKey = 'NL:LANDSCHAP';
      const expectedValues = [
        'BOS',
        'DAM',
        'WAD',
        'WAL',
        'ZEE'
      ];

      expect(actual[problematicKey].slice(0, 5)).to.eql(expectedValues);
    });
  });
});
