#!/usr/bin/env node

const path = require('path');

const PORT = process.env['PORT'] || 8888; 

const STATIC = process.env['STATIC_DIR'] || path.join(__dirname, '../static');
const ASSERTION = process.env['ASSERTION_DIR'] || path.join(__dirname, '../assertions');
console.log(STATIC, ASSERTION);

var app = require('../').app.build({
  staticDir: STATIC,
  assertionDir: ASSERTION
});
app.listen(PORT, function(){
  console.log("Listening on port " + PORT + ".");
});