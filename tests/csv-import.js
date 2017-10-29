'use strict';

const fs = require('fs');
const path = require('path');
const lodash = require('lodash');
const {parseCsv} = require('../web/js/data-csv-import');
const samples = require('./csv-import-samples');

describe('parseCsv()', () => {
  lodash.each(samples, (sample, description) => {
    const {input, shouldError, errorMessage, result} = sample;

    it(description, () => {
      const {documents, errors} = parseCsv(input);

      if (shouldError) {
        expect(errors.length).to.be.greaterThan(0);
        errorMessage instanceof RegExp
          ? expect(errors[0]).to.match(errorMessage)
          : expect(errors[0]).to.equal(errorMessage);
      }
      else {
        expect(documents).to.eql(result);
      }
    });
  });

  describe('Github issues', () => {
    it('ganomede-data#4', () => {
      const filepath = path.join(__dirname, 'csv-import-issue-4.csv');
      const csv = fs.readFileSync(filepath, 'utf8');
      const {documents: actual} = parseCsv(csv);
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
