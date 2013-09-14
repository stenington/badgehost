var express = require('express');
var path = require('path');
var request = require('supertest');
var should = require('should');
var cheerio = require('cheerio');
var sinon = require('sinon');
var jws = require('jws');
var keys = require('./test-keys');

var badgehost = require('../');
var app = badgehost.app.build({
  staticDir: path.join(__dirname, './static'),
  assertionDir: path.join(__dirname, './assertions')
});
app.listen(0);

describe('Assertion templating', function() {
  describe('`test.json`', function() {
    it('badge.json url should be local to app', function(done) {
      request(app)
        .get('/test.json')
        .expect(200, function(err, res){
          if (err)
            return done(err);
          res.body.badge.should.exist;
          res.body.badge.should.include(res.req._headers.host);
          request(res.body.badge)
            .get('')
            .expect(200)
            .expect('Content-Type', /json/, done);
        });
    });

    it('verify.url should be self', function(done) {
      request(app)
        .get('/test.json')
        .expect(200, function(err, res){
          if (err)
            return done(err);
          res.body.verify.should.exist;
          res.body.verify.url.should.exist;
          /* FIXME: Is there a better way to get original request url? */
          res.body.verify.url.should.include(res.req._headers.host);
          res.body.verify.url.should.include(res.req.path);
          done();
        });
    });

    describe('when signed', function(){

      it('verify.url should be public key url', function(done) {
        request(app)
          .get('/test.json?type=signed')
          .expect(200, function(err, res) {
            if (err)
              return done(err);
            var $ = cheerio.load(res.text);
            var signature = $('.signature').text();
            jws.verify(signature, keys.public).should.be.true;
            var assertion = JSON.parse(jws.decode(signature).payload);
            assertion.verify.type.should.equal('signed');
            assertion.verify.url.should.include(res.req._headers.host);
            assertion.verify.url.should.include('public-key');
            done();
          });
      });
    });
  });

  describe('when baked', function(){

    it('assertionUrl should be assertion url', function(done) {
      request(app)
        .get('/test.json?type=baked')
        .expect(200, function(err, res) {
          var $ = cheerio.load(res.text);
          var url = $('.assertionUrl').text();
          url.should.equal('http://' + res.req._headers.host + '/test.json?');
          done(err);
        });
    });

    it('assertionUrl should preserve extra query parameters', function(done) {
      request(app)
        .get('/test.json?foo=1&type=baked&bar=2')
        .expect(200, function(err, res) {
          var $ = cheerio.load(res.text);
          var url = $('.assertionUrl').text();
          url.should.equal('http://' + res.req._headers.host + '/test.json?foo=1&bar=2');
          done(err);
        });
    });
    
    it('dataURI should look like base64 encoded data URI', function(done) {
      request(app)
        .get('/test.json?type=baked')
        .expect(200, function(err, res) {
          var $ = cheerio.load(res.text);
          var imgSrc = $('.baked').attr('src');
          imgSrc.should.match(/data:image\/png;base64,[a-zA-Z0-9\/\+]+/);
          done(err);
        });
    });

  });

  describe('`badge.json`', function() {
    it('badge image url should be local to app', function(done) {
      request(app)
        .get('/badge.json')
        .expect(200, function(err, res){
          if (err)
            return done(err);
          res.body.image.should.exist;
          res.body.image.should.include(res.req._headers.host);
          request(res.body.image)
            .get('')
            .expect(200)
            .expect('Content-Type', /png/, done);
        });
    });
  });

  describe('`issuer.json`', function() {
    it('issuer url should be app base url', function(done) {
      request(app)
        .get('/issuer.json')
        .expect(200, function(err, res){
          if (err)
            return done(err);
          res.body.url.should.exist;
          res.body.url.should.equal('http://' + res.req._headers.host);
          done();
        });
    });
  });

  describe('when mounted as a sub-app', function() {
    var app = express();
    var subApp = badgehost.app.build({
      staticDir: path.join(__dirname, './static'),
      assertionDir: path.join(__dirname, './assertions')
    });
    app.use('/sub', subApp);

    sinon.spy(subApp, 'render');

    it('host template local should include mount point', function(done) {
      request(app)
        .get('/sub/test.json')
        .expect(200, function(err, res){
          if (err)
            return done(err);
          var locals = subApp.render.firstCall.args[1]._locals;
          locals.host.should.include('/sub');
          done();
        });
    });

    it('origin template local should not include mount point', function(done) {
      request(app)
        .get('/sub/test.json')
        .expect(200, function(err, res){
          if (err)
            return done(err);
          var locals = subApp.render.firstCall.args[1]._locals;
          locals.origin.should.not.include('/sub');
          done();
        });
    });
  });
});
