'use strict';

const readCsv = (file, callback) => {
  if (file.type !== 'text/csv')
    return setTimeout(callback, 0, new Error(`Invalid Format: expected "text/csv", got "${file.type}"`));

  const reader = new FileReader();
  reader.onloadend = () => callback(reader.error, reader.result);
  reader.readAsText(file, 'UTF-8');
};

class UniqueWords {
  constructor () {
    this.set = new Set();
  }

  add (word) {
    this.set.add(word);
  }

  words () {
    return Array.from(this.set.values());
  }
}

class Lists {
  constructor () {
    this.lists = Object.create(null);
  }

  addToList (id, word) {
    const list = this.lists[id] = this.lists[id] || new UniqueWords();
    list.add(word);
  }

  asObject () {
    return Object.keys(this.lists).reduce((self, key) => {
      self[key] = this.lists[key].words();
      return self;
    }, Object.create(null));
  }
}

class Parser {
  constructor (csv) {
    const lines = csv
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.split(','));

    this.ids = lines[0];
    this.values = lines.slice(1);
    this.errors = [];

    if (lines.length < 2)
      this.errors.push(new Error('Invalid CSV format: expected at least 2 lines'));
  }

  failed () {
    return this.errors.length > 0;
  }

  parse () {
    if (this.failed())
      return;

    const lists = new Lists();

    this.ids.forEach((listId, column) => {
      // ignore columns without ids
      if (!listId)
        return;

      for (let row = 0; row < this.values.length; ++row) {
        const word = this.values[row][column];
        // ignore empty words
        if (word)
          lists.addToList(listId, word);
      }
    });

    return lists;
  }
}

const parseCsv = (csv) => {
  const parser = new Parser(csv);
  const docs = parser.parse();

  return parser.failed()
    ? parser.errors[0]
    : docs.asObject();
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
