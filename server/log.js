'use strict';

const config = require('../config');
let bunyan = require('bunyan');
let log = bunyan.createLogger({name: config.branding.title}); 
 
const logger = function(){
  let a = arguments;
  log.debug.apply(log, a);
};

logger.debug = log.debug.bind(log);
logger.info = log.info.bind(log);
logger.warn = log.warn.bind(log);
logger.error = log.error.bind(log);
 

module.exports = logger;
