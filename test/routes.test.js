var path = require('path');
var request = require('supertest');
var should = require('should');
var sinon = require('sinon');
var jws = require('jws');
var keys = require('./test-keys');

var badgehost = require('../');
var app = badgehost.app.build({
  staticDir: path.join(__dirname, './static'),
  assertionDir: path.join(__dirname, './assertions')
});
app.listen(0);

describe('Routes', function(){
  describe('static assets', function(){
    it('should host static assets', function(done) {
      request(app)
        .get('/badge.png')
        .expect(200)
        .expect('Content-Type', /png/, done);
    });
  });

  describe('/xxx.json', function(){
    ['test', 'badge', 'issuer'].forEach(function(name) {
      var path = '/' + name + '.json';
      it('should host assertion file ' + path, function(done) { 
        request(app)
          .get(path)
          .expect(200)
          .expect('Content-Type', /json/, done);
      });
    });

    it('should 404 for unknown files', function(done) {
        request(app)
          .get('/NOPE.json')
          .expect(404, done)
    });
  });

  describe('/0.5/xxx.json', function(){
    it('should return assertion if it\'s 0.5', function(done) {
      request(app)
        .get('/0.5/test-0.5.json')
        .expect(200)
        .expect('Content-Type', /json/, done);
    });
    
    it('should 409 if not', function(done) {
      request(app)
        .get('/0.5/test-1.0.json')
        .expect(409, done);
    });
  });

  describe('/1.0/xxx.json', function(){
    it('should return assertion if it\'s 1.0', function(done) {
      request(app)
        .get('/1.0/test-1.0.json')
        .expect(200)
        .expect('Content-Type', /json/, done);
    });
    
    it('should 409 if not', function(done) {
      request(app)
        .get('/1.0/test-0.5.json')
        .expect(409, done);
    });
  });

  describe('?sign=1', function(){
    it('should host public key at /public-key', function(done){
      request(app)
        .get('/public-key')
        .expect(200)
        .end(function(err, res) {
          if (err)
            return done(err);
          res.text.should.equal(keys.public.toString());
          done();
        });
    });

    ['/test.json', '/1.0/test-1.0.json', '/0.5/test-0.5.json'].forEach(function(path) {
      it('should return JSON Web Signature', function(done){
        request(app)
          .get(path + '?sign=1')
          .expect(200)
          .expect('Content-Type', /text/)
          .end(function(err, res) {
            if (err)
              return done(err);
            res.text.should.exist;
            jws.verify(res.text, keys.public).should.be.true;
            done();
          });
      });
    });
  });

  describe('?set={...}', function(){
    ['/test.json', '/1.0/test-1.0.json', '/0.5/test-0.5.json'].forEach(function(path) {
      it('should set ' + path + ' values', function(done){
        sinon.spy(badgehost.app, "set");
        request(app)
          .get(path + '?set=' + encodeURIComponent('{"foo":"bar"}'))
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err)
              return done(err);
            badgehost.app.set.calledOnce.should.be.true;
            badgehost.app.set.firstCall.args[1].should.eql({ foo: "bar" });
            badgehost.app.set.restore();
            done();
          });
      });
    });
  });

  describe('?merge={...}', function(){
    ['/test-0.5.json', '/0.5/test-0.5.json', '/1.0/test-1.0.json'].forEach(function(path) {
      it('should merge ' + path + ' values', function(done){
        sinon.spy(badgehost.app, "merge");
        request(app)
          .get(path + '?merge=' + encodeURIComponent('{"foo":"bar"}'))
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err)
              return done(err);
            badgehost.app.merge.called.should.be.true;
            badgehost.app.merge.firstCall.args[1].should.eql({ foo: "bar" });
            badgehost.app.merge.restore();
            done();
          });
      });
    });

    describe('with ?deep=1', function(){
      it('should deep-merge /1.0/test-1.0.json values', function(done) {
        sinon.spy(badgehost.app, "merge");
        request(app)
          .get('/1.0/test-1.0.json?deep=1&merge=' + encodeURIComponent('{}'))
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            if (err)
              return done(err);
            badgehost.app.merge.called.should.be.true;
            badgehost.app.merge.firstCall.args[2].should.be.ok;
            badgehost.app.merge.restore();
            done();
          });
      });
    });

    it('should fail merging an object into a simple type', function(done) {
      var obj = encodeURIComponent(JSON.stringify({
        badge: {
          something: 'complex'
        }
      }));
      request(app)
        .get('/1.0/test-1.0.json?merge=' + obj)
        .expect(500, done);
    });
  });
});
