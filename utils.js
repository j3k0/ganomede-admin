exports.generateToken = function(len) {
  var buf = []
    , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    , charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.findByUsername = function(username, users, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

exports.consumeToken = function(token, tokens, fn) {
  var username = tokens[token];
  // invalidate the single-use token
  //delete tokens[token];
  return fn(null, username);
}

exports.removeToken = function(token, tokens) {
  var username = tokens[token];
  // invalidate the single-use token
  delete tokens[token];
}

exports.saveToken = function(token, username, tokens, fn) {
	for (var key in tokens) {
	   if (tokens.hasOwnProperty(key)) {
	   	delete tokens[key];
	   }
	}
  tokens[token] = username;
  return fn();
}

exports.parseCookies = function (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

