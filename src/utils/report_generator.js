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
var debugging = require('../common/debugging.js');
var dot2png = require('./dot2png.js');
var EventGraph = require('./event_graph.js');
var fileUtils = require('./file_utils.js');
var { ForkKind, Operation } = require('../common/trace.js');

// External
var fs = require('fs');
var looksSame = require('looks-same');
var mkdirp = require('mkdirp');
var path = require('path');
var promiseFinally = require('promise.prototype.finally');
var sanitize = require('sanitize-filename');
var util = require('util');

promiseFinally.shim();

var root = path.join(__dirname, '../..');
var outDirectory = path.join(root, 'out');

/**
 * Generates the files that are used by the visualization tool in `report/`.
 *
 * More specifically, Creates or updates the file `out/benchmarks.json` and
 * `out/details/<sanitized-run-id>/report.json`.
 */
function reportGenerator(runId, url) {
  console.log('Generating report files'.blue.bold);

  // The parameter `runId` may contain '/'.
  var sanitizedRunId = sanitize(runId);

  var tsReportGenerationStarted = Date.now();

  return createBenchmarkReport(sanitizedRunId, runId, url)
    .then((report) => addBenchmarkToSummary(sanitizedRunId, runId, url, report,
                                            tsReportGenerationStarted))
    .catch((e) => console.error(e.toString().red.bold));
}

/**
 * Updates the file `out/benchmarks.json`.
 */
function addBenchmarkToSummary(id, runId, url, report,
                               tsReportGenerationStarted) {
  var filename = path.join(root, 'out/benchmarks.json');

  // Read benchmarks.
  var benchmarks = [];
  if (fs.existsSync(filename)) {
    benchmarks = JSON.parse(fs.readFileSync(filename));
  }

  // Update benchmarks.
  var benchmark = {
    id: id,
    runId: runId,
    url: url,

    numTests: report.testResults.length,
    numSucceedingTests:
      report.testResults.filter(
        (testResult) => testResult.succeeded === true).length,
    numSucceedingTestsWithIgnoredPixels:
      report.testResults.filter(
        (testResult) => testResult.succeeded === true &&
                        testResult.pixelIgnored === true).length,
    numFailingTests:
      report.testResults.filter(
        (testResult) => testResult.succeeded === false).length,
    numInfeasibleTests:
      report.testResults.filter((testResult) =>
        (testResult.actual && testResult.actual.status === 'FAIL') ||
        (testResult.expected && testResult.expected.status === 'FAIL')).length,
    numErroneousTests:
      report.testResults.filter(
        (testResult) => !testResult.actual || !testResult.expected).length,
    timing: getPerformanceData(report, tsReportGenerationStarted)
  };

  var index = benchmarks.findIndex((other) => other.id === id);
  if (index >= 0) {
    benchmarks[index] = benchmark;
  } else {
    benchmarks.push(benchmark);
  }

  fileUtils.writeJsonSync(filename, benchmarks, /*log=*/true);
}

function getPerformanceData(report, tsReportGenerationStarted) {
  var observationModeTiming = report.observationModeSummary.timing;

  var totalAdverseModeExecutions = 0;
  var totalLoadsPhase2 = 0;
  var totalSynchronousModeExecutions = 0;

  var msTotalAdverseModeExecutionTime = 0;
  var msTotalLoadingTimePhase2 = 0;
  var msTotalSynchronousModeExecutionTime = 0;

  var msLongestTestCase = 0;

  report.testResults.forEach((testResult) => {
    if (testResult.actual && testResult.actual.timing &&
        typeof testResult.actual.timing.tsLoadingStarted === 'number' &&
        typeof testResult.actual.timing.tsAnalysisStarted === 'number') {
      ++totalLoadsPhase2;
      msTotalLoadingTimePhase2 += testResult.actual.timing.tsAnalysisStarted -
                                  testResult.actual.timing.tsLoadingStarted;
    }

    if (testResult.expected && testResult.expected.timing &&
        typeof testResult.expected.timing.tsLoadingStarted === 'number' &&
        typeof testResult.expected.timing.tsAnalysisStarted === 'number') {
      ++totalLoadsPhase2;
      msTotalLoadingTimePhase2 += testResult.expected.timing.tsAnalysisStarted -
                                  testResult.expected.timing.tsLoadingStarted;
    }

    if (testResult.actual && testResult.actual.timing &&
        typeof testResult.actual.timing.tsAnalysisEnded === 'number' &&
        typeof testResult.actual.timing.tsAnalysisStarted === 'number') {
      ++totalAdverseModeExecutions;
      msTotalAdverseModeExecutionTime +=
        testResult.actual.timing.tsAnalysisEnded -
        testResult.actual.timing.tsAnalysisStarted;
    }

    if (testResult.expected && testResult.expected.timing &&
        typeof testResult.expected.timing.tsAnalysisEnded === 'number' &&
        typeof testResult.expected.timing.tsAnalysisStarted === 'number') {
      ++totalSynchronousModeExecutions;
      msTotalSynchronousModeExecutionTime +=
        testResult.expected.timing.tsAnalysisEnded -
        testResult.expected.timing.tsAnalysisStarted;
    }

    if (testResult.actual && testResult.actual.timing &&
        typeof testResult.actual.timing.tsAnalysisEnded === 'number' &&
        typeof testResult.actual.timing.tsLoadingStarted === 'number' &&
        testResult.expected && testResult.expected.timing &&
        typeof testResult.expected.timing.tsAnalysisEnded === 'number' &&
        typeof testResult.expected.timing.tsLoadingStarted === 'number') {
      var msTestCase = testResult.actual.timing.tsAnalysisEnded -
                       testResult.actual.timing.tsLoadingStarted +
                       testResult.expected.timing.tsAnalysisEnded -
                       testResult.expected.timing.tsLoadingStarted;
      msLongestTestCase = Math.max(msLongestTestCase, msTestCase);
    }
  });

  var msAverageAdverseModeExecutionTime = null;
  if (totalAdverseModeExecutions) {
    msAverageAdverseModeExecutionTime = msTotalAdverseModeExecutionTime /
                                        totalAdverseModeExecutions;
  }

  var msAverageLoadingTimePhase2 = null;
  if (totalLoadsPhase2 > 0) {
    msAverageLoadingTimePhase2 = msTotalLoadingTimePhase2 / totalLoadsPhase2;
  }

  var msAverageSynchronousModeExecutionTime = null;
  if (totalSynchronousModeExecutions) {
    msAverageSynchronousModeExecutionTime =
      msTotalSynchronousModeExecutionTime / totalSynchronousModeExecutions;
  }

  var msReportGeneration = Date.now() - tsReportGenerationStarted;
  var msReportGenerationPerTest = null;
  if (report.testResults.length > 0) {
    msReportGenerationPerTest = msReportGeneration / report.testResults.length;
  }

  return {
    msAverageAdverseModeExecutionTime: msAverageAdverseModeExecutionTime,
    msAverageLoadingTimePhase2: msAverageLoadingTimePhase2,
    msAverageSynchronousModeExecutionTime:
      msAverageSynchronousModeExecutionTime,
    msLoadingTimePhase1: observationModeTiming.tsAnalysisStarted -
                         observationModeTiming.tsLoadingStarted,
    msLongestTestCase: msLongestTestCase,
    msTraceGeneration: observationModeTiming.tsAnalysisEnded -
                       observationModeTiming.tsAnalysisStarted,
    msTestPlanning: observationModeTiming.tsTestPlanningEnded -
                    observationModeTiming.tsTestPlanningStarted,
    msReportGeneration: msReportGeneration,
    msReportGenerationPerTest: msReportGenerationPerTest
  };
}

/**
 * Creates the file `out/details/<sanitized-run-id>/report.json`.
 * Returns the generated report.
 */
function createBenchmarkReport(sanitizedRunId, runId, url) {
  var detailsDirectory = path.join(root, 'out/details', sanitizedRunId);
  var testDirectory = path.join(root, 'out', runId);

  // Create output directory if it does not already exist.
  mkdirp.sync(detailsDirectory);

  return Promise.all([
      getPhase1Summary(detailsDirectory, testDirectory),
      getPhase2Summary(detailsDirectory, testDirectory)
    ])
    .then(([observationModeSummary, testResults]) => {
      // Create report.
      var report = {
        id: sanitizedRunId,
        runId: runId,
        url: url,
        testResults: testResults,
        observationModeSummary: observationModeSummary
      };

      fileUtils.writeJsonSync(
        path.join(detailsDirectory, 'report.json'), report, /*log=*/true);

      return report;
    });
}

function createEventGraphForTrace(directory, trace, id) {
  var eventGraph = new EventGraph(trace).deleteDisconnectedNodes().reduce()
                                        .mergeMutateDOMOperations();
  debugging.assertEq(eventGraph.findRoots().length, 1);

  var dot1 = eventGraph.toDot();
  var dot2 = eventGraph.removeSubtreesWithNoActions().toDot();
  return Promise.all([dot2png(dot1), dot2png(dot2)])
    .then(([png1, png2]) => {
      var filename1 = null, filename2 = null;

      if (png1) {
        filename1 = path.join(directory, id + '-full.png');
        fileUtils.writeFileSync(filename1, png1, /*log=*/true);
      }

      if (png2) {
        filename2 = path.join(directory, id + '-actions-only.png');
        fileUtils.writeFileSync(filename2, png2, /*log=*/true);
      }

      return {
        full: filename1 && path.relative(outDirectory, filename1),
        actionsOnly: filename2 && path.relative(outDirectory, filename2)
      };
    });
}

function createEventGraphsForTraces(directory, traces) {
  // Create the directory if it does not already exist.
  mkdirp.sync(directory);

  console.log(
    util.format('Outputting event graphs to %s', directory));

  return Promise
    .all(
      traces.map((trace, id) => createEventGraphForTrace(directory, trace, id))
    )
    .finally(() => console.log('DONE creating event graphs'));
}

function getPhase1Summary(detailsDirectory, testDirectory) {
  var resultFilename = path.join(testDirectory, 'phase-1/result.json');

  if (!fs.existsSync(resultFilename)) {
    return Promise.reject(new Error(
      util.format('Cannot generate report without the following file: %s',
                  resultFilename)));
  }
  var observationModeResults =
    JSON.parse(fs.readFileSync(resultFilename));

  // Create the event graphs.
  var eventGraphDirectory = path.join(detailsDirectory, 'event-graphs');
  var eventGraphURLs = createEventGraphsForTraces(
    eventGraphDirectory,
    observationModeResults.userEventListeners.map((x) => x.trace));

  var onUserEventListenersReady = eventGraphURLs.then((eventGraphURLs) =>
    observationModeResults.userEventListeners.map((result, i) =>
      ({
        id: i,
        description: result.userEventListener.description,
        selector: result.userEventListener.selector,
        type: result.userEventListener.type,
        eventGraphMetadata:
          result.trace.filter((op) => op.operation === Operation.FORK && (
                                        op.kind === ForkKind.AJAX_REQUEST ||
                                        op.kind === ForkKind.LOAD_IMG ||
                                        op.kind === ForkKind.LOAD_RESOURCE ||
                                        op.kind === ForkKind.LOAD_SCRIPT))
                      .map((op) => ({
                        id: op.v,
                        kind: (() => {
                          switch (op.kind) {
                            case ForkKind.AJAX_REQUEST:
                              return 'AJAX (' + op.method.toUpperCase() + ')';
                            case ForkKind.LOAD_IMG:
                              return 'Image';
                            case ForkKind.LOAD_RESOURCE:
                              return 'Resource';
                            case ForkKind.LOAD_SCRIPT:
                              return 'Script';
                            default: debugging.assertUnreachable();
                          }
                        })(),
                        url: op.url })),
        eventGraphURLs: eventGraphURLs[i]
      })));

  return onUserEventListenersReady.then((userEventListeners) => {
    return {
      timing: observationModeResults.timing,
      userEventListeners: userEventListeners
    };
  });
}

function getPhase2Result(resultDirectory) {
  var outputFilename = path.join(resultDirectory, 'result.json');
  console.log(outputFilename)
  if (fs.existsSync(outputFilename)) {
    var output = JSON.parse(fs.readFileSync(outputFilename));

    var result = {
      numPostponedEvents: output.numPostponedEvents,
      screenshotURLs: { before: null, intermediate: null, final: null },
      status: output.status,
      timing: output.timing
    };

    if (output.status === 'FAIL') {
      result.error = output.error;
    }

    var beforeFilename = path.join(resultDirectory, 'result-a.png');
    if (fs.existsSync(beforeFilename)) {
      result.screenshotURLs.before =
          path.relative(outDirectory, beforeFilename);
    }

    var intermediateFilename = path.join(resultDirectory, 'result-b.png');
    if (fs.existsSync(intermediateFilename)) {
      result.screenshotURLs.intermediate =
          path.relative(outDirectory, intermediateFilename);
    }

    var finalFilename = path.join(resultDirectory, 'result.png');
    if (fs.existsSync(finalFilename)) {
      result.screenshotURLs.final =
          path.relative(outDirectory, finalFilename);
    }

    return result;
  }

  return null;
}

function completeIntermediateTestResultUsingImageDiff(result, diffDirectory) {
  return new Promise((resolve) => {
    function done(succeeded, pixelIgnored, diff) {
      result.diff = diff;
      result.succeeded = succeeded;
      result.pixelIgnored = pixelIgnored;
      resolve(result);
    }

    if (result.actual && result.actual.status === 'SUCCESS' &&
        result.expected && result.expected.status === 'SUCCESS') {
      var actualScreenshotURL =
        path.join(outDirectory, result.actual.screenshotURLs.final);
      var expectedScreenshotURL =
        path.join(outDirectory, result.expected.screenshotURLs.final);

      var diffScreenshotFilename = path.join(diffDirectory, result.id + '.png');
      console.log(util.format('Creating diff at %s', diffScreenshotFilename));

      //if (fs.existsSync(diffScreenshotFilename)) {
      //  console.log('Skipped'.grey.bold);
      //} else {

        var ignoreDifferentPixels = null;
        if (result.actual.screenshotURLs.before &&
            result.expected.screenshotURLs.before) {
          var reference = path.join(outDirectory, result.actual.screenshotURLs.before);
          var current = path.join(outDirectory, result.expected.screenshotURLs.before);
          if (fs.existsSync(reference) && fs.existsSync(current)) {
            ignoreDifferentPixels = { reference, current };
          }
        }

        looksSame.createDiff({
            reference: expectedScreenshotURL,
            current: actualScreenshotURL,
            diff: diffScreenshotFilename,
            highlightColor: '#ff00ff',
            tolerance: 10,
            ignoreDifferentPixels: ignoreDifferentPixels
          })
          .then((diff) => {
            if (diff.equal) {
              console.log(util.format('Test %s succeeded', result.id).green.bold);
              done(true, diff.pixelIgnored, null);
            } else {
              console.log(util.format('Test %s failed', result.id).red.bold);
              done(false, false, path.relative(outDirectory, diffScreenshotFilename));
            }
          })
          .catch((error) => {
            console.error(error.toString().red.bold);
            done(null, false, null);
          });
      //}
    } else {
      done(null, false, null);
    }
  });
}

function completeIntermediateTestResultsUsingImageDiff(
    detailsDirectory, intermediateTestResults) {
  console.log(util.format(
    'Determining outcome of %s tests using image diff',
    intermediateTestResults.length));

  var started = Date.now();

  // Create output directory for diff images if it does not already exist.
  var diffDirectory = path.join(detailsDirectory, 'diff-images');
  mkdirp.sync(diffDirectory);

  var onPreviousFinished = Promise.resolve();
  intermediateTestResults.forEach((intermediateTestResult) => {
    onPreviousFinished = onPreviousFinished.then(() =>
      completeIntermediateTestResultUsingImageDiff(
        intermediateTestResult, diffDirectory));
  });
  var onFinished = onPreviousFinished.then(() => intermediateTestResults);

  return onFinished.finally(() => {
    var ended = Date.now();
    console.log('DONE creating diffs (time: %s seconds)',
                Math.round((ended - started) / 1000));
  });
}

function getPhase2Summary(detailsDirectory, testDirectory) {
  var phase2OutputDirectory = path.join(testDirectory, 'phase-2');

  return fileUtils.listDirectories(phase2OutputDirectory, function (filename) {
      return path.basename(filename).indexOf('test-') === 0;
    })
    .then((testDirectories) => {
      var testResultIds = testDirectories.map(
        (testDirectory) => path.basename(testDirectory).substring(5));

      console.log('Generating test results');

      var intermediateTestResults =
        testResultIds
        .map((testResultId) => [testResultId].concat(testResultId.split('-')))
        .map(([testResultId, userEventListenerId1, userEventListenerId2]) => {
          var adverseModeDirectory = path.join(
            phase2OutputDirectory, 'test-' + testResultId, 'adverse-mode');
          var synchronousModeDirectory = path.join(
            phase2OutputDirectory, 'test-' + testResultId, 'synchronous-mode');
          return {
            id: userEventListenerId1 + '-' + userEventListenerId2,
            userEventListener1: userEventListenerId1,
            userEventListener2: userEventListenerId2,
            actual: getPhase2Result(adverseModeDirectory),
            expected: getPhase2Result(synchronousModeDirectory)
          };
        });

      return completeIntermediateTestResultsUsingImageDiff(
        detailsDirectory, intermediateTestResults);
    });
}

if (require.main === module) {
  var argv = require('yargs')
    .usage('Usage: ./report_generator.js --run-id <ID> --url <url>')
    .option('run-id', { demand: true, type: 'string' })
    .option('url', { demand: true, type: 'string' })
    .help()
    .argv;

  reportGenerator(argv.runId, argv.url).catch((e) => console.error(e));
}

module.exports = reportGenerator;
