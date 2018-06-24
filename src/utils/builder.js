#!/usr/bin/env node

/**
 * Copyright 2018 Aarhus University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// External
var browserify = require('browserify');
var colors = require('colors');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var root = path.join(__dirname, '../..');

/**
 * Asynchronously builds the runtime using browserify.
 */
function build() {
  return new Promise((resolve, reject) => {
    console.log("Building".blue.bold);

    // Use browserify to compile the runtime analysis files into a single file
    // that can be loaded in the browser.
    var bundle = browserify()
    .require(path.join(root, 'src/analysis/analysis.js'), { expose: 'analysis' })
    .require(path.join(root, 'src/instrumentation/mini-jalangi.js'), { expose: 'mini-jalangi' })
    .bundle();

    var bundleCode = '';
    bundle.on('data', function (data) {
      bundleCode += data;
    });
    bundle.on('error', function () {
      console.log(arguments);
    });
    bundle.on('end', function() {
      var result = [
        '(function() {',
        '  var isInstrumentationFrameworkInstalled = ',
        '    typeof window.J$ === \'object\' &&' +
        '    typeof window.J$.Se === \'function\';',
        '  if (isInstrumentationFrameworkInstalled &&',
        '      typeof window.J$.analysis === \'object\') {',
        '    console.warn(\'Instrumentation framework already loaded\');',
        '    return;',
        '  }',
        '  var require;',
        '  ' + bundleCode,
        '  if (!isInstrumentationFrameworkInstalled) {',
        '    var miniJalangi = require(\'mini-jalangi\');',
        '    miniJalangi.install();',
        '  }',
        '  var AjaxRacer = require(\'analysis\');',
        '  J$.analysis = new AjaxRacer();',
        '  J$.analysis.removeInjectedScripts();',
        '})();'
      ].join('\n');

      // Output to the folder `out/analysis.js`
      var dest = path.join(root, 'out/analysis.js');

      mkdirp(path.dirname(dest), function (err) {
        if (err) {
          reject(err);
        } else {
          fs.writeFile(dest, result, resolve);
        }
      });
    });
  });
}

// If this file is being run from the command line, then run build.
// Otherwise, build is simply exported.
if (require.main === module) {
  build();
}

module.exports = { build: build };
