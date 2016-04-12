'use strict';

const config = require('./config');
const app = require('./server/app');
const log = require('./server/log');

const server = app.listen(config.http.port, config.http.host, function () {
  const host = server.address().address;
  const port = server.address().port;

  log('App listening at http://%s:%s', host, port);
});
