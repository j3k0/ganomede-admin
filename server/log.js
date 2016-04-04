'use strict';

/* eslint-disable no-console */

const logger = console.log.bind(console);

logger.info = console.info;
logger.warn = console.warn;
logger.error = console.error;

/* eslint-enable no-console */

module.exports = logger;
