var express = require('express');
var nunjucks = require('nunjucks');

exports.build = function build(options) {
  var options = options || {};

  var app = express();

  app.use(express.static(options.staticDir));

  var loader = new nunjucks.FileSystemLoader(options.assertionDir);
  var env = new nunjucks.Environment(loader, {
    autoescape: true
  });
  env.express(app);

  app.get('/:path.json', function(req, res, next) {
    var path = req.params['path'] + '.json';

    var server = req.protocol + '://' + req.headers.host;
    var self = req.protocol + '://' + req.headers.host + req.originalUrl;

    res.type('json');
    res.render(path, { 
      server: server,
      self: self
    });                                               
  });                                                                   

  return app;
};