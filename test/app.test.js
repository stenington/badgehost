var path = require('path');
var request = require('supertest');
var should = require('should');

var app = require('../').app.build({
  staticDir: path.join(__dirname, './static'),
  assertionDir: path.join(__dirname, './assertions')
});
app.listen(0);

describe('App', function(){

  ['test', 'badge', 'issuer'].forEach(function(name) {
    var path = '/' + name + '.json';
    it('should host assertion file ' + path, function(done) { 
      request(app)
        .get(path)
        .expect(200)
        .expect('Content-Type', /json/, done);
    });
  });

  it('should host static assets', function(done) {
    request(app)
      .get('/badge.png')
      .expect(200)
      .expect('Content-Type', /png/, done);
  });
});

describe('`test.json` assertion', function() {

  it('localized badge url should work', function(done) {
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

  it('localized verify url should be self', function(done) {
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