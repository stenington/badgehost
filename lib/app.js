var path = require('path');
var fs = require('fs');
var express = require('express');
var nunjucks = require('nunjucks');
var jws = require('jws');
var keys = require('../test/test-keys'); // TODO: this shouldn't use test-keys
var Badge = require('./badge');

var App = {
  set: function set(base, values) {
    Object.keys(values).forEach(function(key) {
      base[key] = values[key];
    });
    return base;
  },

  merge: function merge(base, values, deep) {
    Object.keys(values).forEach(function(key) {
      if (base[key] && typeof values[key] === 'object') {
        if (typeof base[key] === 'object')
          base[key] = App.merge(base[key], values[key]);
        else if (deep && typeof base[key] === 'string')
          base[key] = base[key] 
              + '?deep=1&merge=' + encodeURIComponent(JSON.stringify(values[key])); 
        else
          throw new Error('Can\'t merge object into non-object: ' + key);
      }
      else {
        base[key] = values[key];
      }
    });
    return base;
  },

  build: function build(options) {
    var options = options || {};

    var app = express();

    app.use(express.static(options.staticDir));
    app.use(express.bodyParser());

    var loaders = [
      new nunjucks.FileSystemLoader(options.assertionDir),
      new nunjucks.FileSystemLoader(path.join(__dirname, '../views'))
    ];
    var env = new nunjucks.Environment(loaders, {
      autoescape: true
    });
    env.express(app);

    app.use(function(req, res, next) {
      var host = req.protocol + '://' + req.headers.host;
      res.locals({
        host: host,
        static: host,
        assertions: host,
        self: host + req.originalUrl,
        key: host + 'public-key'
      });
      next();
    });

    app.param('file', function(req, res, next, file) {
      var file = req.params['file'] + '.json';
      try {
        res.render(file, function(err, str) {
          if (err) 
            return next(err);
          req.params['file'] = file;
          return next();
        });
      }
      catch (e) {
        return next({
          statusCode: 404,
          message: 'Can\'t find ' + file
        });
      }
    });

    app.use(function(req, res, next) {
      var setStr = req.query['set'] || '{}';
      var mergeStr = req.query['merge'] || '{}';
      var deep = req.query['deep'];
      var sign = req.query['sign'];
      res.locals.signed = sign;
      try {
        var sets = JSON.parse(setStr);
        var merges = JSON.parse(mergeStr);
        res.finalize = function(data) {
          var result = App.merge(App.set(data, sets), merges, deep);
          if (sign) {
            var signature = jws.sign({
              header: { alg: 'rs256' },
              privateKey: keys.private,
              payload: result
            });
            return res.render('signed.html', {
              signature: signature,
              assertion: JSON.stringify(result, null, '  ')
            });
          }
          return res.send(result);
        };
        next();
      }
      catch (e) {
        return next(e);
      }
    });

    app.get('/', function(req, res, next) {
      fs.readdir(options.assertionDir, function(err, files) {
        files = files.filter(function(file){
          return file.match(/.*\.json$/);
        });
        if (err)
          return next(err);
        return res.render('index.html', {
          files: files
        });
      });
    });

    app.post('/', function(req, res, next) {
      var base;
      switch(req.body.base){
        case 'useBlank':
          base = "blank";
          break;
        case 'useFile':
          base = req.body.file;
          break;
      }

      var json = req.body.json || "{}";
      try {
        json = JSON.parse(json);
      }
      catch (e) {
        return next(e);
      }

      var query = {};
      switch(req.body.query){
        case 'set':
          query.set = json;
          break;
        case 'merge':
          query.merge = json;
          break;
      }

      if (req.body.deepMerge)
        query.deep = true;

      res.redirect(app.path(base, query));
    });

    app.get('/public-key', function(req, res, next) {
      res.send(keys.public);
    });

    app.get('/:file.json', function(req, res, next) {
      var file = req.params['file'];

      res.render(file, function(err, jsonString) {
        if(err)
          return next(err);
        try {
          var json = JSON.parse(jsonString);
          return res.finalize(json);
        }
        catch (e) {
          console.log(e);
          return next(e);
        }
      });
    });                                                                   

    const BUILT_INS = {
      blank: {}
    };

    app.get('/:builtin', function(req, res, next) {
      var builtin = req.params['builtin'];
      if (!builtin in BUILT_INS)
        return next('No built-in for ' + builtin);
      var builtin = BUILT_INS[builtin];
      return res.finalize(builtin);
    });

    app.get('/0.5/:file.json', function(req, res, next) {
      var file = req.params['file'];
      res.render(file, function(err, jsonString) {
        if (err)
          return next(err);
        try {
          var badge = Badge.parse(jsonString);
          if (badge.version !== Badge.V0_5_0)
            return next({
              statusCode: 409,
              message: file + ' is not a 0.5.0 assertion; downgrading not yet supported'
            });
          return res.finalize(badge.metadata);
        }
        catch (e) {
          return next(e);
        }
      });
    });

    app.get('/1.0/:file.json', function(req, res, next) {
      var file = req.params['file'];
      res.render(file, function(err, jsonString) {
        if (err)
          return next(err);
        try {
          var badge = Badge.parse(jsonString);
          if (badge.version !== Badge.V1_0_0)
            return next({ 
              statusCode: 409, 
              message: file + ' is not a 1.0.0 assertion; upgrading not yet supported'
            });
          return res.finalize(badge.metadata);
        }
        catch (e) {
          return next(e);
        }
      });
    });

    app.use(function(err, req, res, next) {
      var statusCode = err.statusCode || 500;
      var msg = err.message || "Unexpected error";
      res.send(statusCode, msg);
    });

    app.path = function path(file, options){
      var options = options || {};
      var parts = [];
      if (options.set) {
        parts.push('set=' 
            + encodeURIComponent(JSON.stringify(options.set)));
      }
      if (options.merge) {
        parts.push('merge=' 
            + encodeURIComponent(JSON.stringify(options.merge)));
      }
      if (options.deep) {
        parts.push('deep=1');
      }
      var path = '/' + file;
      if (parts.length)
        path += '?' + parts.join('&');
      return path;
    };

    return app;
  }
};

module.exports = App;