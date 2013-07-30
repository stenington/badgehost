var path = require('path');
var request = require('supertest');
var should = require('should');
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
          .get('/test.json?sign=1')
          .expect(200, function(err, res) {
            if (err)
              return done(err);
            var signature = res.text;
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
});
