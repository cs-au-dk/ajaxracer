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
