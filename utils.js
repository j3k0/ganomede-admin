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

exports.consumeRememberMeToken = function(token, tokens, fn) {
  var username = tokens[token];
  // invalidate the single-use token
  delete tokens[token];
  return fn(null, username);
}

exports.saveRememberMeToken = function(token, username, tokens, fn) {
  tokens[token] = username;
  return fn();
}

