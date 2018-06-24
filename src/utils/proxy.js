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
var child_process = require('child_process');
var colors = require('colors');
var extend = require('extend');
var fs = require('fs');
var jsesc = require('jsesc');
var lsof = require('lsof');
var os = require('os');
var path = require('path');
var util = require('util');

var root = path.join(__dirname, '../..');

/**
 * Checks whether the proxy has been started.
 * This function returns a boolean asynchronously.
 */
function isStarted(port) {
  return new Promise((resolve, reject) => {
    lsof.rawTcpPort(port, (data) => resolve(data.length > 0));
  });
}

/**
 * Checks whether the proxy has been started.
 * This function returns a boolean asynchronously.
 */
function kill(port) {
  return new Promise((resolve, reject) => {
    var killedPids = {};
    lsof.rawTcpPort(port, function (data) {
      data.forEach((p) => {
        if (!killedPids[p.pid]) {
          console.log(util.format('Killing proxy (pid: %s)', p.pid));
          process.kill(p.pid);
          killedPids[p.pid] = true;
        }
      });
      (function resolveOnKilled(attempts) {
        if (attempts == 10) {
          // Give up.
          resolve();
          return;
        }
        lsof.rawTcpPort(port, function (data) {
          if (data.length === 0) {
            resolve();
          } else {
            setTimeout(() => resolveOnKilled(attempts + 1), 500);
          }
        });
      })(0);
    });
  });
}

/**
 * Starts the proxy (i.e., a mitmdump process) asynchronously.
 * The returned promise is resolved when the proxy has been started.
 */
function start(analysis, argv, port) {
  return kill(port).then(() => {
    // Start the mitmdump process
    var wrappedArgv = "'" + JSON.stringify(argv).replace(/\'/g, "\\'") + "'";
    var script = ['instrumentation_server/proxy.py', '--argv', wrappedArgv];

    var args = ['--anticache', '--no-http2', '-p', port.toString(), '-s',
                script.join(' ')];

    console.log(
      util.format('Starting proxy (mitmdump %s)',
        args.map((arg) => arg[0] === '-'
                            ? arg
                            : jsesc(arg, { quotes: 'double', wrap: true }))
            .join(' ')
      ).blue.bold);

    var mitmdump = child_process.spawn('mitmdump', args, {
      cwd: root, detached: true // , stdio: 'inherit'
    });

    // Return a promise that resolves the proxy seems to have started
    // (keep checking every 200 ms)
    return new Promise((resolve, reject) => {
      var interval = 200, waited = 0, maxWait = 20000;
      var intervalId = setInterval(function () {
        isStarted(port).then(function (proxyStarted) {
          if (proxyStarted) {
            setTimeout(resolve, 500);
            clearInterval(intervalId);
          } else if (waited >= maxWait) {
            // Timeout, 20s have elapsed and mitmproxy is still not there!
            reject();
          } else {
            waited += interval;
          }
        });
      }, interval);

      var stderr = "";
      mitmdump.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      mitmdump.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr));
        }
      });
    });
  });
}

module.exports = {
  start: start,
  kill: kill
};
