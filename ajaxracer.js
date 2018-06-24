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

// Internal
var builder = require('./src/utils/builder.js');
var httpServer = require('./src/utils/http-server.js');
var phase1 = require('./src/phases/phase-1.js');
var phase2 = require('./src/phases/phase-2.js');
var reportGenerator = require('./src/utils/report_generator.js');

// External
var colors = require('colors');
var defaults = require('object.defaults');
var fs = require('fs');
var path = require('path');
var promiseFinally = require('promise.prototype.finally');
var util = require('util');

promiseFinally.shim();

var root = __dirname;

function main(runId, url, options) {
  defaults(options, {
    build: true,
    dryRun: false,
    headless: true,
    rerun: true,
    skipPhase1: false,
    skipPhase2: false,
    skipReportGeneration: false,
    maxTimerDuration: 2000,
    maxTimerChainLength: -1,
    waitForPromises: true
  });

  if (fs.existsSync(url)) {
    url = util.format('http://localhost:8080/%s', url);
  }

  // 1) Build the analysis runtime.
  var onBuildCompleted = null;
  if (options.build) {
    onBuildCompleted = builder.build();
  } else {
    onBuildCompleted = Promise.resolve();
  }

  // 2) Start http-server.
  var onHttpServerStarted = onBuildCompleted.then(
    () => httpServer.serve(path.resolve('.'), 8080));

  // 3) Run Phase 1.
  var onPhase1Completed = onHttpServerStarted;
  if (!options.skipPhase1) {
    onPhase1Completed = onHttpServerStarted.then(() => {
      console.log('Running Phase 1'.blue.bold);
      return phase1(runId, url, options)
        .catch((e) => console.log(e.toString().red.bold));
    });
  }

  // 4) Run Phase 2.
  var onPhase2Completed = onPhase1Completed;
  if (!options.skipPhase2) {
    onPhase2Completed = onPhase1Completed.then(() => {
      console.log('Running Phase 2'.blue.bold);
      return phase2(runId, url, options)
        .catch((e) => console.log(e.toString().red.bold));;
    });
  }

  // 5) Run report generation.
  var onReportGenerated = onPhase2Completed;
  if (!options.skipReportGeneration) {
    onReportGenerated =
      onPhase2Completed.finally(() => reportGenerator(runId, url));
  }

  // 6) DONE!
  return onReportGenerated;
}

// If this file is being run from the command line, then run main.
// Otherwise, main is simply exported.
if (require.main === module) {
  var argv = require('yargs')
    .usage('Usage: ./ajaxracer.js --run-id <ID> --url <url>')
    .option('dry-run', { default: false, type: 'boolean' })
    .option('headless', { default: true, type: 'boolean' })
    .option('max-timer-chain-length', { default: -1, type: 'number' })
    .option('max-timer-duration', { default: 2000, type: 'number' })
    .option('run-id', { demand: true, type: 'string' })
    .option('rerun', { default: true, type: 'boolean' })
    .option('skip-phase-1', { default: false, type: 'boolean' })
    .option('skip-phase-2', { default: false, type: 'boolean' })
    .option('skip-report-generation', { default: false, type: 'boolean' })
    .option('url', { demand: true, type: 'string' })
    .option('wait-for-promises', { default: true, type: 'boolean' })
    .help()
    .argv;

  main(argv.runId, argv.url, argv)
    .then(() => {
      console.log('DONE'.blue.bold);
      process.exit(0);
    }, (err) => {
      console.error(err.stack.red.bold);
      process.exit(1);
    });
}

module.exports = main;
