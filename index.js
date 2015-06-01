var express = require('express');
var app = express();
var passport = require('passport');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var request = require("request");
var utils = require('./utils');
var RememberMeStrategy = require('passport-remember-me').Strategy;
var bodyParser = require('body-parser');

var API_BASE_URL = process.env.API_BASE_URL || "https://ganomede-devel.fovea.cc";
var API_TEMP_URL = process.env.API_TEMP_URL || "http://private-194a93-ganomedeadmin.apiary-mock.com";



app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(cookieParser());
app.use(session({secret: 'ganomede-admin', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new RememberMeStrategy(
  function(token, done) {
  	console.log(token);
  	done(null, token);
  },
  function(user, done) {
    var token = utils.generateToken(64);
    done(null, token);
  }
));


app.post('/api/login', 
	passport.authenticate('remember-me', { failureRedirect: '/login', failureFlash: true }),
	function(req, res, next) {
		var token = utils.generateToken(64);
    res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 }); // 7 days
    request.post(API_TEMP_URL + req.url).pipe(res);
  },
  function(req, res) {
  	res.redirect('/admin/');
  }
 );




app.get(/avatars\/v1\/(.+)$/, function(req, res) {
	request.get(API_BASE_URL + req.url).pipe(res);
});

/* serves main page */
 app.get("/", function(req, res) {
 	res.writeHeader(304, {

 	});
 });

//post login
 // app.post("/api/login", function(req, res){
 // 	request.post(API_TEMP_URL + req.url).pipe(res);
 // });

//get users list
 app.get("/api/users", function(req, res){
 	request(API_TEMP_URL + req.url).pipe(res);
 });

 //get user details
 app.get("/api/user/:id", function(req, res){
 	request(API_TEMP_URL + req.url).pipe(res);
 });

  //ban user
 app.post("/api/user/ban/:id", function(req, res){
 	request.post(API_TEMP_URL + req.url).pipe(res);
 });

 //get location
 app.get("/api/location/:id", function(req, res){
 	request(API_BASE_URL + '/users/v1/' + req.params.id +'/metadata/location').pipe(res);
 });

/* serves main page */
 app.get("/admin/", function(req, res) {
    res.sendFile(__dirname + "/web/index.html");
 });

/* serves all the static files */
 app.get(/^\/admin\/(.+)$/, function(req, res) {
     console.log('static file request : ' + req.params[0]);
     res.sendFile(__dirname + "/web/" + req.params[0]); 
 });

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});