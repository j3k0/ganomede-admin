'use strict';

//const CmsEngine = require('couchdb-node-cms');
const config = require('./config');
const app = require('./server/app');
// const auth = require('./server/auth');
const log = require('./server/log');

/*const cmsEngine = new CmsEngine({
   config: config.couch,
   server: app,
   auth: auth.mwValidate,
   apiRoot: `${config.http.apiBase}/cms`
 });

cmsEngine.start();*/

const server = app.listen(config.http.port, config.http.host, function () {
  const host = server.address().address;
  const port = server.address().port;

  log('App listening at http://%s:%s', host, port);
});
