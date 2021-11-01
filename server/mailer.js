'use strict';

const _ = require('lodash'); 

const env = function(x) {
  return process.env["MAILER_" + (x.toUpperCase())];
};

const createTransport = function(arg) {
  arg = arg || {};
  const nodemailer = arg.nodemailer || require('nodemailer');
  const from = arg.from  ||process.env.MAILER_SEND_FROM;
  const subject = arg.subject || process.env.MAILER_SEND_SUBJECT;
  const text = arg.text || process.env.MAILER_SEND_TEXT;
  const html = arg.html || process.env.MAILER_SEND_HTML;
  const port = arg.port || +env('PORT') || 0;
  const host = arg.host || env('HOST');
  const secure = arg.secure || env('SECURE') === 'true';
  const auth = arg.auth || {
    user: env('AUTH_USER'),
    pass: env('AUTH_PASS')
  };
  const ignoreTLS = arg.ignoreTLS || env('IGNORE_TLS') === 'true';
  const name = arg.name || env('NAME');
  const localAddress = arg.localAddress || env('LOCAL_ADDRESS');
  const connectionTimeout = arg.connectionTimeout || env('CONNECTION_TIMEOUT');
  const greetingTimeout = arg.greetingTimeout || env('GREETING_TIMEOUT');
  const socketTimeout = arg.socketTimeout || env('SOCKET_TIMEOUT');
  const debug = arg.debug || env('DEBUG') === 'true';
  const authMethod = arg.authMethod || env('AUTH_METHOD');
  const log = arg.log || require("./log");
  const options = {};
  if (port) {
    options.port = port;
  }
  if (host) {
    options.host = host;
  }
  options.secure = secure;
  if (auth && auth.user && auth.pass) {
    options.auth = {
      user: auth.user,
      pass: auth.pass
    };
  }
  if (ignoreTLS) {
    options.ignoreTLS = ignoreTLS;
  }
  if (name) {
    options.name = name;
  }
  if (localAddress) {
    options.localAddress = localAddress;
  }
  if (connectionTimeout) {
    options.connectionTimeout = connectionTimeout;
  }
  if (greetingTimeout) {
    options.greetingTimeout = greetingTimeout;
  }
  if (socketTimeout) {
    options.socketTimeout = socketTimeout;
  }
  options.debug = debug;
  if (authMethod) {
    options.authMethod = authMethod;
  }
  options.logger = log;
  const defaults = {
    from: from,
    subject: subject,
    text: text,
    html: html
  };
  log.debug({
    options: options
  }, 'nodemailer.createTransport');
  const transport = nodemailer.createTransport(options);
  return {
    defaults: defaults,
    sendMail: function(options, cb) {
      let req_id;
      if (options.req_id) {
        req_id = options.req_id;
        delete options.req_id;
      }
      const mailOptions = _.extend({}, defaults, options);
      log.debug({
        mailOptions: mailOptions,
        req_id: req_id
      }, "mailer.sendMail");
      const mailCallback = function(err, info) {
        let messageId;
        let response;
        if (err) {
          log.error(err, "failed to send email");
        } else if (info) {
          messageId = info.messageId, response = info.response;
          log.info({
            messageId: messageId,
            response: response
          }, "message sent");
        } else {
          log("no error and no info?");
        }
        return cb && cb(err, info);
      };
      return transport.sendMail(mailOptions, mailCallback);
    }
  };
};

module.exports = {
  createTransport: createTransport
};
