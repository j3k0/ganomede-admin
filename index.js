'use strict';

const config = require('./config');
const app = require('./server/app');
const log = require('./server/log');

const die = (title) => (exception) => {
  log.error('****************');
  log.error('*** CRITICAL ***');
  log.error('****************');
  log.error('');
  log.error(title);
  log.error('');
  log.error(exception);
  log.error('');
  log.error('****************');
  log.error('');

  process.exit(1);
};

const main = () => {
  log('Running with config', config);

  const server = app.listen(config.http.port, config.http.host, function () {
    const host = server.address().address;
    const port = server.address().port;

    log('App listening at http://%s:%s', host, port);
  });
};

if (!module.parent) {
  process.on('uncaughtException', die('uncaughtException'));
  process.on('unhandledRejection', die('unhandledRejection'));

  main();
}
