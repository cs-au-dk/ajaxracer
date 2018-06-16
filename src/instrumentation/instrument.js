#!/usr/bin/env node

// External
var argv = require('yargs')
  .option('argv', { demand: false, type: 'string' })
  .option('kind', { demand: true, options: ['html', 'js'], type: 'string' })
  .option('o', { demand: false, type: 'string' })
  .option('url', { demand: true, type: 'string' })
  .argv;
var fs = require('fs');

// Internal
var instrumentHtml = require('./instrument-html.js').rewrite;
var instrumentJavaScript = require('./instrument-js.js');

// Read the file to be instrumented from stdin
var input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', function (data) {
  input += data;
});
process.stdin.on('end', function () {
  // By now, the entire file to be instrumented has been read from stdin.
  // If 'html' was passed to --kind, then instrument as HTML.
  // Otherwise, instrument as JavaScript.
  var output;
  if (argv.kind === 'html') {
    output = instrumentHtml(input, {
      argv: argv.argv,
      url: argv.url
    });
  } else {
    output = instrumentJavaScript(input, {
      allowReturnOutsideFunction: false,
      isExternalScript: true,
      isInlineScript: false,
      url: argv.url
    });
  }

  // If a file name has been passed to the --o option, then store the
  // instrumented file there. Otherwise, write the result to stdout.
  if (argv.o) {
    fs.writeFile(argv.o, output.toString());
  } else {
    process.stdout.write(output.toString());
  }
});
