'use strict';

const pkg = require("./package.json");
const os = require("os");
//const CmsEngine = require('couchdb-node-cms');
const config = require('./config');
const app = require('./server/app');
const auth = require('./server/auth');
const log = require('./server/log');

/*const cmsEngine = new CmsEngine({
   config: config.couch,
   server: app,
   auth: auth.mwValidate,
   apiRoot: `${config.http.apiBase}/cms`
 });

cmsEngine.start();*/

//
// About endpoint
//

const aboutData = {
    type: pkg.name,
    version: pkg.version,
    description: pkg.description,
    hostname: os.hostname(),
    startDate: new Date().toISOString()
};
const about = function(req, res) {
    res.send(aboutData);
};
app.get("/about", about);
app.get(config.http.apiBase + "/about", about);

const server = app.listen(config.http.port, config.http.host, function () {
  const host = server.address().address;
  const port = server.address().port;

  log('App listening at http://%s:%s', host, port);
});
