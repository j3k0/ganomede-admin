var express = require('express');
var app = express();
var request = require("request");
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var API_BASE_URL = process.env.API_BASE_URL || "https://ganomede-devel.fovea.cc";
var API_TEMP_URL = process.env.API_TEMP_URL || "http://private-194a93-ganomedeadmin.apiary-mock.com/api";

app.get(/avatars\/v1\/(.+)$/, function(req, res) {
	request.get(API_BASE_URL + req.url).pipe(res);
});

/* serves main page */
 app.get("/", function(req, res) {
 	res.writeHeader(304, {

 	});
 });


//post login
 app.post("/admin/login", function(req, res){
 	request.post(API_TEMP_URL + '/login',
 		req.body,
 		function (error, response, body) {
 			if (!error && response.statusCode == 200) {
            	res.send(body)
            }
    	}
	);
 });

//get users list
 app.get("/admin/users", function(req, res){
 	request(API_TEMP_URL +'/getAll', 
 		function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		    res.send(body); 
		  }
	});
 });

 //get users details
 app.get("/admin/user/details/:id", function(req, res){
 	console.log("details");
 	request(API_TEMP_URL +'/user/' + req.params.id, 
 		function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		    res.send(body); 
		  }
	});
 });

 //get location
 app.get("/admin/location/:id", function(req, res){
 	request(API_BASE_URL + '/users/v1/' + req.params.id +'/metadata/location', 
 		function (error, response, body) {
		  if (!error && response.statusCode == 200) {
		    res.send(body); 
		  }
	});
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