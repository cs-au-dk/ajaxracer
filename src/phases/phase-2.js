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
var EventGraph = require('../utils/event_graph.js');
var fileUtils = require('../utils/file_utils.js');
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
 * Loads the web page twice for every pair of conflicting event handlers
 * (once in "synchronous" mode and once in "adverse" mode).
 */
function phase2(runId, url, options) {
  debugging.assertEq(typeof options.rerun, 'boolean');
  debugging.assertEq(typeof options.maxTimerDuration, 'number');
  debugging.assertEq(typeof options.maxTimerChainLength, 'number');
  debugging.assertEq(typeof options.waitForPromises, 'boolean');

  var conflictPairs = getConflictingPairsFromRunId(runId);
  console.log(util.format('Testing %s conflicting pairs of user event handlers',
                          conflictPairs.length).blue.bold);

  var onLastRunFinished = Promise.resolve([]);

  conflictPairs.forEach((conflictPair, i) => {
    // When the previous run has finished, then start the new ones.
    onLastRunFinished = onLastRunFinished.then((allFailures) => {
      console.log(util.format(
        'Running test for pair: <%s, %s> (%s/%s)',
        conflictPair.first.description ||
          (conflictPair.first.type + '@' + conflictPair.first.selector),
        conflictPair.second.description ||
          (conflictPair.second.type + '@' + conflictPair.second.selector),
        i + 1, conflictPairs.length).blue.bold);

      return runTest(runId, url, options, conflictPair)
        .then((testFailures) => allFailures.concat(testFailures));
    });
  });

  return onLastRunFinished.then((failures) => {
    if (failures.length > 0) {
      throw new Error(failures);
    }
  })
  .finally(() => proxy.kill(8081));
}

function runTest(runId, url, options, conflictPair) {
  var failures = [];
  return Promise.resolve()
    .then(() => runMode(runId, url, options, conflictPair, 'synchronous'))
    .catch((e) => failures.push(e))
    .then(() => runMode(runId, url, options, conflictPair, 'adverse'))
    .catch((e) => failures.push(e))
    .then(() => failures);
}

function runMode(runId, url, options, conflictPair, mode) {
  var taskId =
    path.join(runId, 'phase-2', 'test-' + conflictPair.id, mode + '-mode');
  var destination = path.join(root, 'out', taskId, 'result.json');

  if (!options.rerun && fs.existsSync(destination)) {
    console.log(util.format(
      'Skipping %s mode (already run previously)', mode).blue.bold);
    return Promise.resolve();
  }

  console.log(util.format('Running %s mode', mode).blue.bold);

  if (options.dryRun) {
    var result = {
      id: conflictPair.id,
      logs: [],
      status: 'N/A'
    };
    return fileUtils.writeTo(destination, /*verbose=*/true)(
      /*data=*/JSON.stringify(result, undefined, 2));
  }

  return proxy.start(path.join(root, 'out/analysis.js'), {
      config: extend(options, configs.get(url)),
      mode: mode,
      pairOfConflictingUserEventListeners: conflictPair,
      phase: 2
    }, 8081)
    .then(() => protractor.launch(taskId, url, options.headless))
    .then(() => console.log(''));
}

/**
 * Returns the conflicting configurations from the run with ID `runId`.
 */
function getConflictingPairsFromRunId(runId) {
  var filename = path.join(root, 'out/', runId, 'phase-1/result.json');
  debugging.assert(fs.existsSync(filename));

  // Read the raw output from Phase I.
  var output = JSON.parse(fs.readFileSync(filename));
  if (!output.timing) {
    output.timing = {};
  }
  output.timing.tsTestPlanningStarted = Date.now();

  var userEventListeners =
    output.userEventListeners.map((entry) => entry.userEventListener);

  // Create a mapping from every user event listener to the corresponding
  // event graph.
  var eventGraphs = new Map();
  userEventListeners.forEach((userEventListener, i) =>
    eventGraphs.set(
      userEventListener,
      new EventGraph(output.userEventListeners[i].trace)
        .deleteDisconnectedNodes()
        .reduce()));

  var result =
    getConflictingPairsFromEventGraphs(userEventListeners, eventGraphs);

  output.timing.tsTestPlanningEnded = Date.now();
  fs.writeFileSync(filename, JSON.stringify(output, undefined, 2));

  return result;
}

/**
 * Returns the conflicting configurations.
 */
function getConflictingPairsFromEventGraphs(userEventListeners, eventGraphs) {
  var pairs = [];

  // Iterate through all pairs of user event listeners.
  iteratePairsOfUserEventHandlers(
    userEventListeners,
    (id, userEventListener, otherUserEventListener) => {
      var eventGraph = eventGraphs.get(userEventListener);
      var otherEventGraph = eventGraphs.get(otherUserEventListener);

      if (eventGraph.hasLikelyAJAXConflictWith(otherEventGraph)) {
        pairs.push({
          id: id,
          first: userEventListener,
          second: otherUserEventListener
        });
      }
    }
  );

  return pairs;
}

function iteratePairsOfUserEventHandlers(userEventListeners, callback) {
  userEventListeners.forEach((userEventListener, i) =>
    userEventListeners.forEach((otherUserEventListener, j) =>
      callback(i + '-' + j, userEventListener, otherUserEventListener)));
}

module.exports = phase2;
