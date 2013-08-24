#!/usr/bin/env node

const path = require('path');

const PORT = process.env['PORT'] || 8888; 

var app = require('../').app.build({
  staticDir: process.env['STATIC_DIR'],
  assertionDir: process.env['ASSERTION_DIR'],
  index: true
});
app.listen(PORT, function(){
  console.log("Listening on port " + PORT + ".");
  console.log("Serving static files from " + app.staticDir + ".");
  console.log("Serving assertions from " + app.assertionDir + ".");
});