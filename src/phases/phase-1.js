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
