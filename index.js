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

var API_BASE_URL = process.env.API_BASE_URL || "https://ganomede-devel.fovea.cc";
var API_TEMP_URL = process.env.API_TEMP_URL || "http://private-194a93-ganomedeadmin.apiary-mock.com";
var API_CHECKPOINTS_URL = process.env.API_CHECKPOINTS_URL || "http://192.168.59.103" || "http://zalka.fovea.cc:49660";


var users = [
	{username: "jad", password: "jad"},
	{username: "test", password: "test"},
	{username: "1", password: "1"},
	{username: "2", password: "2"}
];
var tokens = {};

var sendNeedAuth = function (res) {
   res.status(401).send({
       success: false,
       error: "Need authentication",
       needAuthentication: true
   });
};


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

function issueToken(user, done) {
  var token = utils.generateToken(64);
  utils.saveToken(token, user.username, tokens, function(err) {
    if (err) { return done(err); }
    return done(null, token);
  });
}


app.post('/api/login', 
	passport.authenticate('local'),
	function(req, res, next) {
		 issueToken({username: req.body.username, password:req.body.password}, function(err, token) {
	      if (err) { return next(err); }
	      res.cookie('token', token, { path: '/', httpOnly: true, maxAge: 604800000 });
	      res.send({success: true});
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

/* serves main page */
 app.get("/", function(req, res) {
 	res.writeHeader(304, {

 	});
 });

 app.get("/api/logout", auth, function(req, res){
 	utils.removeToken(utils.parseCookies(req).token, tokens);
 	res.clearCookie('token');
 	res.redirect('/admin/');
 });

//get users list
 app.get("/api/users", auth, function(req, res){
 	request(API_TEMP_URL + req.url).pipe(res);
 });

 //get user details
 app.get("/api/user/:id", auth, function(req, res){
 	request(API_TEMP_URL + req.url).pipe(res);
 });

  //ban user
 app.post("/api/user/ban/:id", auth, function(req, res){
 	request.post(API_TEMP_URL + req.url).pipe(res);
 });

 //get location
 app.get("/api/location/:id", auth, function(req, res){
 	request(API_BASE_URL + '/users/v1/' + req.params.id +'/metadata/location').pipe(res);
 });

  //get location
 app.get("/api/test/", auth, function(req, res){
  console.log(req.params);
  console.log(req.body);
  res.send("ok");
 });

//get items list
 app.delete("/api/item/:id", auth, function(req, res){
 	request.del(API_TEMP_URL + req.url).pipe(res);
 });

 app.get("/api/items/:name", auth, function(req, res){
 	request(API_TEMP_URL + req.url).pipe(res);
 });

app.get("/api/items", auth, function(req, res){
 	request(API_TEMP_URL + req.url).pipe(res);
});

app.put("/api/item/:id", auth, function(req, res){
	request.put(API_TEMP_URL + req.url).pipe(res);
});

app.post("/api/item", auth, function(req, res){
	request.post(API_TEMP_URL + req.url).pipe(res);
});

//monitoring
app.get("/api/monitoring", auth, function(req, res){
  request(API_BASE_URL + "/registry/v1/services").pipe(res);
});


app.get(/^\/checkpoints\/v1\/(.+)$/, auth, function(req, res){
  request(API_CHECKPOINTS_URL + req.url).pipe(res);
});

/* serves main page */
 app.get("/admin/", function(req, res) {
    res.sendFile(__dirname + "/web/index.html");
 });

/* serves all the static files */
 app.get(/^\/admin\/(.+)$/, function(req, res) {
     res.sendFile(__dirname + "/web/" + req.params[0]); 
 });

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});