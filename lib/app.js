var express = require('express');
var nunjucks = require('nunjucks');
var Badge = require('./badge');

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
        return res.json(badge.metadata);
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
        return res.json(badge.metadata);
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