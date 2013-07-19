var express = require('express');
var nunjucks = require('nunjucks');

const V0_5_0 = 'v0.5.0';
const V1_0_0 = 'v1.0.0';

exports.build = function build(options) {
  var options = options || {};

  var app = express();

  app.use(express.static(options.staticDir));

  var loader = new nunjucks.FileSystemLoader(options.assertionDir);
  var env = new nunjucks.Environment(loader, {
    autoescape: true
  });
  env.express(app);

  app.use(function(req, res, next) {
    var host = req.protocol + '://' + req.headers.host;
    res.locals({
      host: host,
      static: host,
      assertions: host,
      self: host + req.originalUrl
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

  app.get('/:file.json', function(req, res, next) {
    var file = req.params['file'];

    res.type('json');
    res.render(file);
  });                                                                   

  function isAssertion(json) {
    return typeof json.badge !== 'undefined';
  }

  function detectVersion(json) {
    if (isAssertion(json))
      return (typeof json.badge === 'object') ? V0_5_0 : V1_0_0;
    throw new Error('not an assertion');
  }

  app.get('/0.5/:file.json', function(req, res, next) {
    var file = req.params['file'];
    res.render(file, function(err, jsonString) {
      if (err)
        return next(err);
      try {
        var json = JSON.parse(jsonString);
        if (!isAssertion(json))
          return next(file + ' is not an assertion');
        if (detectVersion(json) !== V0_5_0)
          return next({
            statusCode: 409,
            message: file + ' is not a 0.5.0 assertion; downgrading not yet supported'
          });
        return res.json(json);
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
        var json = JSON.parse(jsonString);
        if (!isAssertion(json))
          return next(file + ' is not an assertion');
        if (detectVersion(json) !== V1_0_0) 
          return next({ 
            statusCode: 409, 
            message: file + ' is not a 1.0.0 assertion; upgrading not yet supported'
          });
        return res.json(json);
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

  return app;
};