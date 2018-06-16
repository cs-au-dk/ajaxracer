// Internal
var configs = require('../../experiments/configs.js');
var debugging = require('../common/debugging.js');
var protractor = require('../utils/protractor.js');
var proxy = require('../utils/proxy.js');

// External
var colors = require('colors');
var extend = require('extend');
var fs = require('fs');
var path = require('path');
var promiseFinally = require('promise.prototype.finally');
var util = require('util');

promiseFinally.shim();

var root = path.join(__dirname, '../..');

/**
 * Generates a trace for the website at URL `url` and
 * stores the result in `out/<site>/phase-1/result.json`.
 */
function phase1(runId, url, options) {
  debugging.assertEq(typeof options.headless, 'boolean');
  debugging.assertEq(typeof options.rerun, 'boolean');

  var taskId = path.join(runId, 'phase-1');
  var destination = path.join(root, 'out', taskId, 'result.json');
  if (!options.rerun && fs.existsSync(destination)) {
    console.log(
      util.format('Skipping Phase 1 (already run previously)').blue.bold);
    return Promise.resolve();
  }

  return proxy
    .start(path.join(root, 'out/analysis.js'), {
      config: extend(options, configs.get(url)),
      phase: 1
    }, 8081)
    .then(() => protractor.launch(taskId, url, options.headless, false))
    .finally(() => proxy.kill(8081));
}

module.exports = phase1;
