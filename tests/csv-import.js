'use strict';

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
});
