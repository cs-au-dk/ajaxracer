#!/usr/bin/env node

// Internal
var builder = require('../src/utils/builder.js');
var debugging = require('../src/common/debugging.js');
var EventGraph = require('../src/utils/event_graph.js');
var ajaxracer = require('../ajaxracer.js');
var fileUtils = require('../src/utils/file_utils.js');

// External
var colors = require('colors');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var util = require('util');

var argv = require('yargs')
  .usage(
    'Usage: npm test [-- --filter "ajax" --skip-phase-2]')
  .option('filter', {
    default: '',
    describe: 'Pattern that specifies which tests that should be run',
    type: 'string'
  })
  .option('skip-phase-2', {
    default: false,
    describe: 'Skip tests for Phase 2',
    type: 'boolean'
  })
  .help()
  .argv;

var root = path.join(__dirname, '..');

function checkOutputFromPhase1(testDirectoryRelative, expected) {
  var output = fileUtils.readJsonSync(
      path.join(root, 'out', testDirectoryRelative, 'phase-1/result.json'));

  debugging.assert(output.userEventListeners instanceof Array);
  debugging.assertEq(output.userEventListeners.length,
                     expected.userEventListeners.length);

  output.userEventListeners.forEach((obj, i) => {
    var actualEventGraph = null, expectedEventGraph = null;
    try {
      debugging.assertStructurallyEq(
        obj.userEventListener,
        expected.userEventListeners[i].userEventListener);

      var expectedTrace = expected.userEventListeners[i].trace;
      if (expectedTrace.length === 0) {
        debugging.assertEq(obj.trace.length, 0);
      } else {
        actualEventGraph = new EventGraph(obj.trace).reduce();
        expectedEventGraph = new EventGraph(expectedTrace).reduce();

        debugging.assert(
          actualEventGraph.equals(expectedEventGraph),
          util.format(
            'Unexpected event graph for click event listener at %s',
            expected.userEventListeners[i].userEventListener.selector));
      }
    } catch (e) {
      console.error(util.format(
        'Unexpected event graph for user event listener: %s',
        JSON.stringify(obj.userEventListener, undefined, 2)).red.bold);

      // Write dot files for the actual/expected trace to out/.
      if (actualEventGraph !== null) {
        var dest = path.join(root, 'out', testDirectoryRelative,
                             'trace-actual.dot');
        console.log('Writing actual trace to %s', dest);
        fs.writeFileSync(dest, actualEventGraph.toDot());
      }

      if (expectedEventGraph !== null) {
        var dest = path.join(root, 'out', testDirectoryRelative,
                             'trace-expected.dot');
        console.log('Writing expected trace to %s', dest);
        fs.writeFileSync(dest, expectedEventGraph.toDot());
      }

      throw e;
    }
  });

  checkLogs(output.logs, expected.logs);

  return Promise.resolve();
}

function checkOutputFromPhase2(testDirectoryRelative, expected) {
  var adverseModeChecker = null;
  if ('adverseMode' in expected) {
    adverseModeChecker =
      checkOutputFromAdverseMode(testDirectoryRelative, expected.adverseMode);
  } else {
    adverseModeChecker = Promise.resolve();
  }

  var synchronousModeChecker = null;
  if ('synchronousMode' in expected) {
    synchronousModeChecker =
      checkOutputFromSynchronousMode(testDirectoryRelative, expected.synchronousMode);
  } else {
    synchronousModeChecker = Promise.resolve();
  }

  return Promise.all([adverseModeChecker, synchronousModeChecker]);
}

function checkLogs(actual, expected) {
  debugging.assert(actual instanceof Array);
  debugging.assert(expected instanceof Array);

  debugging.assertEq(actual.length, expected.length);
  expected.forEach((log) =>
    debugging.assert(actual.some((other) => other.indexOf(log) >= 0),
                     util.format("Unable to find log message: %s", log)));
}

function checkOutputFromAdverseMode(testDirectoryRelative, expectations) {
  var outputDirectory = path.join('out', testDirectoryRelative, 'phase-2');
  return checkOutputFromAdverseOrSynchronousMode(
    outputDirectory, expectations, 'adverse');
}

function checkOutputFromSynchronousMode(testDirectoryRelative, expectations) {
  var outputDirectory = path.join('out', testDirectoryRelative, 'phase-2');
  return checkOutputFromAdverseOrSynchronousMode(
    outputDirectory, expectations, 'synchronous');
}

function checkOutputFromAdverseOrSynchronousMode(
    outputDirectory, expectations, mode) {
  var promise = fileUtils.listFiles(outputDirectory, (filename) =>
    path.basename(filename) === 'result.json' &&
    filename.indexOf('/' + mode + '-mode/') >= 0);
  return promise.then((outputs) => {
    debugging.assertEq(outputs.length, expectations.length);
    outputs.map((filename) => JSON.parse(fs.readFileSync(filename)))
           .forEach((output) => {
             var expected =
               expectations.find((expected) => expected.id === output.id);

             checkLogs(output.logs, expected.logs);

             delete output.logs;
             delete output.timing;
             delete expected.logs;

             debugging.assertStructurallyEq(output, expected);
           });
  });
}

/**
 * Runs AjaxRacer on <testDirectory>/index.html, and compares the output
 * to the expected output in `expected.json`.
 */
function runProtractorTest(testDirectory, skipPhase2) {
  var testDirectoryRelative = path.relative(root, testDirectory);

  console.log(
    util.format("Running test: %s", testDirectoryRelative).blue.bold);

  // Check if there is a property "adverseMode" or "synchronousMode" in the
  // expected output.
  var expectations = JSON.parse(
    fs.readFileSync(path.join(testDirectoryRelative, 'expected.json')));
  var requiresPhase2 = 'adverseMode' in expectations ||
                       'synchronousMode' in expectations;

  // Run observation mode.
  var onAnalysisCompleted = ajaxracer(
    /*site=*/testDirectoryRelative,
    /*url=*/path.join(testDirectoryRelative, 'index.html'),
    /*options=*/{
      build: false,
      skipPhase2: !requiresPhase2 || skipPhase2,
      skipReportGeneration: true
    });

  // Compare output to expected.json.
  return onAnalysisCompleted.then(() => {
    var expected = fileUtils.readJsonSync(
      path.join(testDirectory, 'expected.json'));

    var phase1Checker =
      checkOutputFromPhase1(testDirectoryRelative, expected.observationMode);

    var phase2Checker = null;
    if (skipPhase2) {
      phase2Checker = Promise.resolve();
    } else {
      phase2Checker = checkOutputFromPhase2(testDirectoryRelative, expected);
    }

    return Promise.all([phase1Checker, phase2Checker]);
  });
}

function runProtractorTests(skipPhase2, filter) {
  // Get all the files named "expected.json" in the test/ directory.
  var expectedOutputsPromise = fileUtils.listFiles(
    __dirname,
    (filename) => path.basename(filename) === 'expected.json' &&
                  fs.existsSync(
                    path.join(path.dirname(filename), 'index.html')) &&
                  filename.indexOf(filter) >= 0);

  // Get all the directories inside the test/ directory, which contain a
  // file "expected.json".
  var testDirectoriesPromise = expectedOutputsPromise.then(
    (filenames) => filenames.map(path.dirname));

  // Run all the Protractor tests one by one.
  return runTestsOneByOne(
    testDirectoriesPromise,
    (testDirectory) => runProtractorTest(testDirectory, skipPhase2));
}

function runTestsOneByOne(testsPromise, runTest) {
  return testsPromise.then((tests) => {
    var onLastTestFinished = Promise.resolve(/*allTestsSucceededSoFar=*/true);

    // Iterate all the tests.
    tests.forEach((test) => {
      // Run this test once the previous test has finished.
      onLastTestFinished = onLastTestFinished.then((allTestsSucceededSoFar) =>
        runTest(test).then(
          () => {
            console.log('Test succeeded\n'.green.bold);
            return allTestsSucceededSoFar;
          },
          (err) => {
            console.error(util.format("Test failed: %s", test).red.bold)
            console.error(err.stack, '\n');
            return /*allTestsSucceededSoFar=*/false;
          }
        ));
    });

    return onLastTestFinished;
  });
}

// Delete old test results.
rimraf.sync(path.join(root, 'out/test/'));

// Run tests
builder.build()
  .then(() => runProtractorTests(argv.skipPhase2, argv.filter))
  .then((allProtractorTestsSucceeded) => {
    if (allProtractorTestsSucceeded) {
      console.log("All tests succeeded".green.bold);
      process.exit(0);
    } else {
      console.log("Some tests are failing".red.bold);
      process.exit(1);
    }
  })
