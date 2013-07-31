var path = require('path');
var request = require('supertest');
var should = require('should');

var App = require('../').app;
var app = App.build({
  staticDir: path.join(__dirname, './static'),
  assertionDir: path.join(__dirname, './assertions')
});
app.listen(0);

describe('App', function() {
  
  describe('#set', function() {
    it('should change specified values', function() {
      App.set({
        'non-object': 'hi',
        'object': { 'some': 'stuff' },
        'etc': 'things'
      }, {
        'non-object': 'new',
        'object': 'new',
        'etc': { 'new': 'obj' }
      }).should.eql({
        'non-object': 'new',
        'object': 'new',
        'etc': { 'new': 'obj' }
      });
    });

    it('should add new key/values', function() {
      App.set({}, { 'hi': 'there' }).should.eql({ 'hi': 'there' });
    });

    it('should leave unchanged key/values', function() {
      App.set({ 'old': 'value' }, {}).should.eql({ 'old': 'value' });
    });
  });

  describe('#merge', function(){
    it('should set non-object values', function() {
      App.merge({
        'not': 'an object',
        'clobber': { 'this': 'object' }
      }, {
        'not': 'new',
        'clobber': 'it'
      }).should.eql({
        'not': 'new',
        'clobber': 'it'
      });
    });

    it('should recurse into object values', function() {
      App.merge({
        'is': { 
          'an': 'object',
          'leave': 'alone'
        }
      }, {
        'is': { 
          'an': 'obj', 
          'extra': 'stuff' 
        }
      }).should.eql({
        'is': { 
          'an': 'obj', 
          'extra': 'stuff',
          'leave': 'alone'
        }
      });
    });

    it('should throw when merging non-objects', function() {
      (function(){
        App.merge({
          'non': 'object'
        }, {
          'non': { 'some': 'object' }
        });
      }).should.throw(/Can't merge object into non-object/);
    });

    describe('deep=true', function(){
      it('should append deep merge query string where object overwrites non-object', function() {
        var obj = App.merge({
          'some': 'url'
        }, {
          'some': { 'deep': 'merge' }
        }, true).should.eql({
          'some': 'url?deep=1&merge=' + encodeURIComponent(JSON.stringify({ 'deep': 'merge' }))
        });
      });
    });
  });
});

describe('App.build()', function() {
  describe('#path', function() {
    it('should set merge, set, and deep params', function() {
      var path = app.path('foo.json', {
        merge: { foo: 'bar' },
        set: { foo: 'bar' },
        deep: true
      });
      var obj = encodeURIComponent(JSON.stringify({ foo: 'bar' }));
      path.should.match(/\/foo.json?/);
      path.should.include('set=' + obj);
      path.should.include('merge=' + obj);
      path.should.include('deep=1');
    });

    it('should skip params if none specified', function() {
      app.path('foo.json', {}).should.equal('/foo.json');
      app.path('foo.json').should.equal('/foo.json');
    });
  });
});
