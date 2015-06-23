var express = require('express');
var app = express();
var passport = require('passport');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var request = require("request");
var utils = require('./utils');
var RememberMeStrategy = require('passport-remember-me').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var bodyParser = require('body-parser');
var flash = require("flash");
var package = require("./package.json");
var os = require("os"), 
  CmsEngine = require('couchdb-node-cms'),
  config = require('./config');

var API_BASE_URL = process.env.API_BASE_URL || "https://staging.ggs.ovh";
var API_TEMP_URL = process.env.API_TEMP_URL || "http://private-194a93-ganomedeadmin.apiary-mock.com";
var API_CHECKPOINTS_URL = process.env.API_CHECKPOINTS_URL || "http://192.168.59.103" || "http://zalka.fovea.cc:49660";

var services = {
  SERVERS: [],
  ANALYTICS: []
}

addServices(services.SERVERS, "SERVERS");
addServices(services.ANALYTICS, "ANALYTICS");

function addServices(array, name) {
  var i = 1;
  while (process.env[name + "_LINK" + i + "_URL"] && process.env[name + "_LINK" + i + "_NAME"]) {
    array.push({name: process.env[name + "_LINK" + i + "_NAME"],
      url: process.env[name + "_LINK" + i + "_URL"]});
    i++;
  }
}


var users = [
	{ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }
];
var tokens = {};


var sendNeedAuth = function (res) {
   res.status(401).send({
       success: false,
       error: "Need authentication",
       needAuthentication: true
   });
};

var apiBase = "/" + package.api;

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(cookieParser());
app.use(session({secret: 'ganomede-admin', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


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


var auth = function(req, res, next){
	var token = (utils.parseCookies(req) && utils.parseCookies(req).token) ? utils.parseCookies(req).token : null;
	utils.consumeToken(token, tokens, function(err, username) {
      if (err || !username) { sendNeedAuth(res); return; }

      utils.findByUsername(username, users, function(err, user) {
        if (err || !user) { sendNeedAuth(res); return; }
        next();
      });
    });
};

var cmsEngine = new CmsEngine({
   config: config,
   server: app,
   auth: auth,
   apiRoot: '/cms/admin/v1'
 });

cmsEngine.start();

function issueToken(user, done) {
  var token = utils.generateToken(64);
  utils.saveToken(token, user.username, tokens, function(err) {
    if (err) { return done(err); }
    return done(null, token);
  });
}


app.post(apiBase + '/api/login', passport.authenticate('local'), function(req, res, next) {
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

app.get(/avatars\/v1\/(.+)$/, auth, function(req, res) {
	request.get(API_BASE_URL + req.url).pipe(res);
});

 app.get(apiBase + "/api/logout", auth, function(req, res){
 	utils.removeToken(utils.parseCookies(req).token, tokens);
 	res.clearCookie('token');
 	res.redirect('/admin/');
 });

//get users list
app.get(apiBase + "/api/users", auth, function(req, res){
    request(API_TEMP_URL + "/api/users").pipe(res);
});

//get users list
app.get(apiBase + "/api/users/:name", auth, function(req, res){
    request(API_TEMP_URL + "/api/users/" + req.params.name).pipe(res);
});

//get user details
app.get(apiBase + "/api/user/:id", auth, function(req, res){
    request(API_TEMP_URL + req.url).pipe(res);
});

//ban user
app.post(apiBase + "/api/user/ban/:id", auth, function(req, res){
    request.post(API_TEMP_URL + req.url).pipe(res);
});

//get location
app.get(apiBase + "/api/location/:id", auth, function(req, res){
    request(API_BASE_URL + '/users/v1/' + req.params.id +'/metadata/location').pipe(res);
});


//get users list
app.get(apiBase + "/api/links/:key", auth, function(req, res){
  switch(req.params.key){
    case "servers":
      res.send(services.SERVERS);
    break;
    case "analytics":
      res.send(services.ANALYTICS);
    break;
    default:
      res.send([]);
  }
});

//get items list
app.delete(apiBase + "/api/item/:id", auth, function(req, res){
    request.del(API_TEMP_URL + req.url).pipe(res);
});

app.get(apiBase + "/api/items/:name", auth, function(req, res){
    request(API_TEMP_URL + "/api/items/" + req.params.name).pipe(res);
});

app.get(apiBase + "/api/items", auth, function(req, res){
 	request(API_TEMP_URL + "/api/items").pipe(res);
});

app.put(apiBase + "/api/item/:id", auth, function(req, res){
	request.put(API_TEMP_URL + "/api/item/" + req.params.id).pipe(res);
});

app.post(apiBase + "/api/item", auth, function(req, res){
	request.post(API_TEMP_URL + req.url).pipe(res);
});

//
// About endpoint
//
var aboutData = {
    type: package.name,
    version: package.version,
    description: package.description,
    hostname: os.hostname(),
    startDate: new Date().toISOString()
};
var about = function(req, res) {
    res.send(aboutData);
};
app.get("/about", about);
app.get(apiBase + "/about", about);

//
// Ping endpoint
//
var ping = function(req, res) {
    res.send("pong/" + req.params.token);
};
app.get("/ping/:token", ping);
app.get(apiBase + "/ping/:token", ping);

// Monitoring
app.get(apiBase + "/api/monitoring", auth, function(req, res){
    request(API_BASE_URL + "/registry/v1/services").pipe(res);
});


app.get(/^\/checkpoints\/v1\/(.+)$/, auth, function(req, res){
    request(API_CHECKPOINTS_URL + req.url).pipe(res);
});

/* serves main page */
app.get(apiBase , function(req, res) {
    res.sendFile(__dirname + "/web/index.html");
});

/* serves all the static files */
app.get(/^\/admin\/v1\/(.+)$/, function(req, res) {
    res.sendFile(__dirname + "/web/" + req.params[0]);
});

var server = app.listen(process.env.PORT || 8000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
