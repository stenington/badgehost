var should = require('should');
var Badge = require('../lib/badge');

describe('Badge', function() {
  describe('#parse', function(){
    
    it('should parse "valid" assertions', function() {
      var badge = Badge.parse({
        badge: {},
        foo: 'bar'
      });
      badge.should.exist;
      badge.metadata.should.have.property('badge');
      badge.metadata.should.have.property('foo', 'bar');
    });

    it('should parse "valid" assertions as strings', function() {
      var badge = Badge.parse(JSON.stringify({
        badge: {},
        foo: 'bar'
      }));
      badge.should.exist;
      badge.metadata.should.have.property('badge');
      badge.metadata.should.have.property('foo', 'bar');
    });

    it('should detect versions', function(){
      var badge0_5 = Badge.parse({
        badge: {}
      });
      badge0_5.version.should.equal(Badge.V0_5_0);

      var badge1_0 = Badge.parse({
        badge: 'url'
      });
      badge1_0.version.should.equal(Badge.V1_0_0);
    });

  });
});
