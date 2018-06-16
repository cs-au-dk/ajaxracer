#!/usr/bin/env node

var acorn = require('acorn');

function isJavaScript(input) {
  try {
    acorn.parse(input);
    return true;
  } catch (e) {
    return false;
  }
}

if (require.main === module) {
  var input = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', function (data) {
    input += data;
  });
  process.stdin.on('end', function () {
    if (!isJavaScript(input)) {
      console.error('SyntaxError');
      process.exit(1);
    }
  });
}
