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

var child_process = require('child_process');
var colors = require('colors');
var path = require('path');
var util = require('util');

var root = path.join(__dirname, '../..');

/**
 * This function uses the NPM package `http-server` to serve a directory on a
 * given port.
 *
 * Returns a promise that gets resolved once the http server is live.
 */
function serve(directory, port) {
  return new Promise((resolve, reject) => {
    console.log(util.format(
      'HTTP server: Serving \'%s\' on port %s', directory, port).blue.bold);

    // Start the http server
    child_process.spawn('http-server', ['-p', port, directory],
                        { cwd: root, stdio: 'ignore' });

    // Wait until the http server appears to be live according to wget
    var wget;
    var wait = 250, waited = 0, maxWait = 5000;
    function waitHttpServer() {
      if (typeof wget === 'undefined' || wget.error || wget.status != 0) {
        wget = child_process.spawnSync('wget', ['-qO-', 'http://127.0.0.1:' + port]);
        if (waited < maxWait) {
          waited += wait;
          setTimeout(waitHttpServer, wait);
        } else {
          console.log('Await for http-server failed'.red.bold);
          reject();
        }
      } else {
        resolve();
      }
    }

    waitHttpServer();
  });
}

module.exports = {
  serve: serve
};
