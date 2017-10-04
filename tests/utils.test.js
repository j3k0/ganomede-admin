'use strict';

const expect = require('expect.js');
const utils = require('../server/utils');

describe('utils', function () {
  describe('Upstream', function () {
    it('has .prefix prop without trailing `/`', function () {
      const urlOptions = new utils.Upstream({
        protocol: 'http',
        hostname: 'localhost',
        port: 80,
        pathname: '/v1/api/'
      });

      const urlString = new utils.Upstream('http://example.com');

      expect(urlOptions.prefix).to.be('http://localhost:80/v1/api');
      expect(urlString.prefix).to.be('http://example.com');
    });

    it('returns UpstreamError in case of network error', function (done) {
      const upstream = new utils.Upstream('http://invalid-dns:1/');
      upstream.request({method: 'get'}, function (err) {
        expect(err).to.be.an(Error);
        expect(err.name).to.be('UpstreamError');
        expect(err.message).to.match(/ENOTFOUND/);
        expect(err.reason).to.be.an(Error);
        done();
      });
    });

    it('returns UpstreamError in case of HTTP not 2xx code', function (done) {
      const upstream = new utils.Upstream('http://example.com/this-is-404-most-likely-very-probably');
      upstream.request({method: 'get'}, function (err) {
        expect(err).to.be.an(Error);
        expect(err.name).to.be('UpstreamError');
        expect(err.message).to.match(/HTTP 404/);
        expect(err.reason).to.be.a('string');
        done();
      });
    });
  });
});
