// External
var child_process = require('child_process');
var path = require('path');
var os = require('os');
var util = require('util');

var root = path.join(__dirname, '../..');

/**
 * Opens the website at URL `url` using protractor (see the files in `driver/`).
 * The parameter `port` is optional, and is used to determine on which port
 * the proxy server is running (default 8081).
 */
function launch(runId, url, headless, screenshot = true) {
  var args = [
    'protractor_conf.js', '--output-dir', runId, '--url', url,
    '--screenshot', screenshot, '--disableChecks'];

  if (headless) {
    args.push('--headless');
  }

  return launchCustom(args, path.join(root, 'driver'));
}

function launchCustom(args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(util.format(
      'Launching protractor (protractor %s)', args.join(' ')).blue.bold);

    var started = Date.now();
    var protractor = child_process.spawn(
      'protractor', args, { cwd: cwd, stdio: 'inherit' });

    var timer = setTimeout(() => exitHandler(1, true), 5 * 60 * 1000);

    protractor.on('close', (code) => exitHandler(code, false));

    var hasFinished = false;

    function exitHandler(code, timeout) {
      if (hasFinished) {
        return;
      } else {
        hasFinished = true;
        if (timeout) {
          protractor.kill();
        } else {
          clearTimeout(timer);
        }
      }

      // Kill Chrome and chromedriver instances
      var onCleanFinished = clean();

      onCleanFinished.then(() => {
        if (code === 0) {
          resolve();
        } else {
          var message = util.format(
            'Protractor failed (exit code: %s, timeout: %s)', code, !!timeout);
          reject(new Error(message));
        }
      });
    }
  });
}

/**
 * A harsh way to clean up after protractor has been running,
 * to avoid problems that may appear if protractor, for example,
 * does not properly shutdown Google Chrome.
 */
function clean() {
  return new Promise((resolve, reject) => {
    if (os.platform() === 'darwin') {
      // Kill Google Chrome
      try {
        child_process.execSync('pkill -f "Google Chrome"');
      } catch (e) {
      }

      // Kill chromedriver
      try {
        child_process.execSync('pkill -f chromedriver');
      } catch (e) {
      }
    } else {
      try {
        // Kills both Google Chrome and chromedriver
        child_process.execSync('pkill -f chrome');
      } catch (e) {
      }
    }

    setTimeout(resolve, 1000);
  });
}

module.exports = {
  launch: launch,
  launchCustom: launchCustom
};
