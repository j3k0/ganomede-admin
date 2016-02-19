'use strict';

const passport = require('passport');
const utils = require('./utils');
const LocalStrategy = require('passport-local').Strategy;
const pkg = require("./package.json");
const os = require("os");
const CmsEngine = require('couchdb-node-cms');
const config = require('./config');
const app = require('./server/app');

const log = console.log; // eslint-disable-line no-console

const users = [
  { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }
];
const tokens = {};

if (process.env.ADMIN_TOKEN) {
    utils.saveToken(process.env.ADMIN_TOKEN, users[0].username, tokens, function(/*err*/) {});
}

const sendNeedAuth = function (res) {
   res.status(401).send({
       success: false,
       error: "Need authentication",
       needAuthentication: true
   });
};


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  utils.findByUsername(user.username, users, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
      utils.findByUsername(username, users, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      });
  }
));


const auth = function(req, res, next){
  const token = req.cookies && req.cookies.token;
  utils.consumeToken(token, tokens, function(err, username) {
      if (err || !username) { sendNeedAuth(res); return; }

      utils.findByUsername(username, users, function(err, user) {
        if (err || !user) { sendNeedAuth(res); return; }
        next();
      });
    });
};

const cmsEngine = new CmsEngine({
   config: config,
   server: app,
   auth: auth,
   apiRoot: `${config.http.apiBase}/cms`
 });

cmsEngine.start();

const issueToken = function (user, done) {
  const token = process.env.ADMIN_TOKEN || utils.generateToken(64);
  utils.saveToken(token, user.username, tokens, function(err) {
    if (err) { return done(err); }
    return done(null, token);
  });
};


app.post(config.http.apiBase + '/api/login', passport.authenticate('local'), function(req, res, next) {
    if (res.headerSent) { return; }
     issueToken({
             username: req.body.username,
             password:req.body.password
         }, function(err, token) {
             if (err) {
                 return next(err);
             }
             res.cookie('token', token, { path: '/', httpOnly: true, maxAge: 604800000 });
             res.send({ success: true });
             // return next();
      });
    },
    function(req, res) {
        res.redirect('/admin/');
    }
 );

app.get(config.http.apiBase + "/api/islogged", auth, function(req, res){
  res.status(200).send({
    success: true
  });
 });

 app.get(config.http.apiBase + "/api/logout", auth, function(req, res){
  utils.removeToken(req.cookies && req.cookies.token, tokens);
  res.clearCookie('token');
  res.send({
    success: true
  });
 });

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

//
// Ping endpoint
//

const ping = function(req, res) {
    res.send("pong/" + req.params.token);
};
app.get("/ping/:token", ping);
app.get(config.http.apiBase + "/ping/:token", ping);

const server = app.listen(process.env.PORT || 8000, function () {

  const host = server.address().address;
  const port = server.address().port;

  log('Example app listening at http://%s:%s', host, port);

});
