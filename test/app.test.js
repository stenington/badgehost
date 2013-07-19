var path = require('path');
var request = require('supertest');
var should = require('should');

var app = require('../').app.build({
  staticDir: path.join(__dirname, './static'),
  assertionDir: path.join(__dirname, './assertions')
});
app.listen(0);

describe('App', function(){
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

});

describe('?set={...}', function(){
  it('should set assertion values', function(done){
    var obj = encodeURIComponent(JSON.stringify({
      foo: 'bar',
      recipient: {
        foo: 'bar'
      },
      baz: {
        foo: 'bar'
      }
    }));
    request(app)
      .get('/test.json?set=' + obj)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err)
          return done(err);
        res.body.should.have.property('foo', 'bar');
        res.body.should.have.property('recipient');
        res.body.recipient.should.eql({ 'foo': 'bar' });
        res.body.should.have.property('baz');
        res.body.baz.should.eql({ 'foo': 'bar' });
        done();
      });
  });

  it('should merge assertion values', function(done){
    var obj = encodeURIComponent(JSON.stringify({
      foo: 'bar',
      recipient: {
        foo: 'bar'
      },
      baz: {
        foo: 'bar'
      }
    }));
    request(app)
      .get('/test.json?merge=' + obj)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
        if (err)
          return done(err);
        res.body.should.have.property('foo', 'bar');
        res.body.should.have.property('recipient');
        res.body.recipient.should.have.property('foo', 'bar');
        res.body.recipient.should.have.property('hashed'); // pre-existing in test.json
        res.body.should.have.property('baz');
        res.body.baz.should.eql({ 'foo': 'bar' });
        done();
      });
  });
});

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