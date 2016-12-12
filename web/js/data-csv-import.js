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
    const isNew = !this.set.has(word);
    if (isNew)
      this.set.add(word);
    return isNew;
  }

  words () {
    return Array.from(this.set.values());
  }
}

class Lists {
  constructor () {
    this.lists = Object.create(null);
  }

  // returns TRUE if new list
  createList (id) {
    const isNew = !this.lists[id];
    if (isNew)
      this.lists[id] = new UniqueWords();
    return isNew;
  }

  // returns TRUE if new word
  addToList (id, word) {
    return this.lists[id].add(word);
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
    this.warnings = [];

    if (lines.length < 2)
      this.errors.push('Invalid CSV format: expected at least 2 lines');
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
      if (!listId) {
        this.warnings.push(`Column #${column + 1} is missing ID.`);
        return;
      }

      // duplicate column IDs
      if (!lists.createList(listId))
        this.errors.push(`Multiple columns have same ID "${listId}".`);

      for (let row = 0; row < this.values.length; ++row) {
        const word = this.values[row][column];

        // ignore empty words
        if (!word)
          continue;

        const newWord = lists.addToList(listId, word);

        // duplicate words
        if (!newWord)
          this.errors.push(`Column #${column + 1} (${listId}) has duplicate words (${word}).`);
      }
    });

    return lists.asObject();
  }
}

const parseCsv = (csv) => {
  const parser = new Parser(csv);
  const docs = parser.parse();

  return {
    documents: docs,
    errors: parser.errors,
    warnings: parser.warnings
  };
};

// callback(err, {docsToInsert})
module.exports = (file, callback) => {
  readCsv(file, (err, csv) => {
    if (err)
      return callback(err);

    const {documents, errors, warnings} = parseCsv(csv);
    callback(null, documents, {errors, warnings});
  });
};

module.exports.parseCsv = parseCsv;
