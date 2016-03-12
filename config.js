'use strict';

const pkg = require('./package.json');

const config = {
  "port": +process.env.COUCHDB_PORT || 5984,
  "host": process.env.COUCHDB_HOST || "localhost",
  "db": process.env.COUCHDB_DB || "blog",

  http: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 8000,
    apiBase: `/${pkg.api}`
  },

  auth: {
    admin: {
      username: process.env.ADMIN_USERNAME || '1',
      password: process.env.ADMIN_PASSWORD || '1',
      token: process.env.ADMIN_TOKEN || null
    }
  }
};

if (typeof process.env.COUCHDB_USER == "undefined")
  config.user = "admin";
else
  config.user = process.env.COUCHDB_USER;

if (typeof process.env.COUCHDB_PASSWORD == "undefined")
  config.password = "admin";
else
  config.password = process.env.COUCHDB_PASSWORD;

module.exports = config;
