'use strict';

module.exports = {
  valid: {
    input: `fr:animals,fr:towns
chien,paris
chat,rouen
elephant,toulouse
souris,paris
`,
    shouldError: false,
    errorMessage: null,
    result: {
      'fr:animals': ['chien', 'chat', 'elephant', 'souris'],
      'fr:towns': ['paris', 'rouen', 'toulouse', 'paris']
    }
  },

  'ignores empty id columns': {
    input: `number,,letter
1,garbate-to-ignore,a
2,garbate-to-ignore,b
3,garbate-to-ignore,c
4,garbate-to-ignore,d
5,garbate-to-ignore,e
`,
    shouldError: false,
    errorMessage: null,
    result: {
      'number': [1, 2, 3, 4, 5].map(String),
      'letter': ['a', 'b', 'c', 'd', 'e']
    }
  },

  'skips empty values in columns': {
    input: `fr:animaux,en:animals,es:ciudades
Chien,Dog,Madrid
Chat,Cat,Barcelona
,Dragon,Mexico
,,Lima
`,
    shouldError: false,
    errorMessage: null,
    result: {
      'fr:animaux': ['Chien', 'Chat'],
      'en:animals': ['Dog', 'Cat', 'Dragon'],
      'es:ciudades': ['Madrid', 'Barcelona', 'Mexico', 'Lima']
    }
  },

  'fails on CSV files with too little lines': {
    input: `number,letter`,
    shouldError: true,
    errorMessage: 'Invalid CSV format: expected at least 2 lines',
    result: undefined
  }
};
