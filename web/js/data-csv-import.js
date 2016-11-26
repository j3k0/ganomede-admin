'use strict';

const readCsv = (file, callback) => {
  if (file.type !== 'text/csv')
    return setTimeout(callback, 0, new Error(`Invalid Format: expected "text/csv", got "${file.type}"`));

  const reader = new FileReader();
  reader.onloadend = () => callback(reader.error, reader.result);
  reader.readAsText(file, 'UTF-8');
};

const parseCsv = (csv) => {
  const lines = csv
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(','));

  if (lines.length < 2)
    return new Error('Invalid CSV format: expected at least 2 lines');

  const ids = lines.slice(0, 1)[0];
  const values = lines.slice(1);

  const columnsToCount = ids
    .map((id, idx) => idx)
    .filter(index => !!ids[index]);

  const documents = columnsToCount.reduce((self, idx) => {
    const id = ids[idx];
    self[id] = [];
    return self;
  }, {});

  for (let i = 0; i < values.length; ++i) {
    const row = values[i];

    columnsToCount.forEach(index => {
      const id = ids[index];
      const list = documents[id];
      const val = row[index];

      if (val)
        list.push(val);
    });
  }

  return documents;
};

// callback(err, {docsToInsert})
module.exports = (file, callback) => {
  readCsv(file, (err, csv) => {
    if (err)
      return callback(err);

    const documents = parseCsv(csv);

    return documents instanceof Error
      ? callback(documents)
      : callback(null, documents);
  });
};

module.exports.parseCsv = parseCsv;
