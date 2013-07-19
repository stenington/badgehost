#!/usr/bin/env node

const path = require('path');

const PORT = process.env['PORT'] || 8888; 

const STATIC = process.env['STATIC_DIR'] || path.join(__dirname, '../static');
const ASSERTIONS = process.env['ASSERTIONS_DIR'] || path.join(__dirname, '../assertions');

var app = require('../').app.build({
  staticDir: STATIC,
  assertionDir: ASSERTIONS
});
app.listen(PORT, function(){
  console.log("Listening on port " + PORT + ".");
});