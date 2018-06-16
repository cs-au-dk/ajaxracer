// Internal
var debugging = require('../src/common/debugging.js');
var oracle = require('./oracle.js');
var protractor = require('../src/utils/protractor.js');
var fileUtils = require('../src/utils/file_utils.js');

// External
var colors = require('colors');
var fs = require('fs');
var path = require('path');
var util = require('util');

// Retrieve the command line arguments that were passed to protractor_conf.js
var argv = browser.params;
var root = path.join(__dirname, '..');

var duration = {
  MINUTE: 60 * 1000,
  SECOND: 1000
};

describe('AjaxRacer', () => {
  it('should generate trace', (done) => {
    console.log(util.format('Opening URL in the browser: %s', argv.url).blue.bold);

    var timing = {
      tsLoadingStarted: Date.now(),
      tsAnalysisStarted: null,
      tsAnalysisEnded: null
    };

    browser.driver.get(argv.url);
    browser.ignoreSynchronization = true;

    waitForWebPageToLoad(5 * duration.MINUTE)
      .then(() => timing.tsAnalysisStarted = Date.now())
      .then(startAnalysis)
      .then(() => waitForAnalysisToFinish(5 * duration.MINUTE))
      .then(() => timing.tsAnalysisEnded = Date.now())
      .then(() => outputAnalysisResults(timing))
      .catch((e) => {
        console.error(util.format(
          'Something went wrong: %s', e instanceof Error ? e.message : e).red);

        // Cause script to fail with non-zero exit code in case of a runtime
        // assertion failure.
        expect(e.toString()).not.toContain('Assertion failure');
      })
      .then(done, (err) => expect(err).toBeNull());
  });

  afterEach(function (done) {
    browser.driver.manage().deleteAllCookies()
           .then(() => browser.executeScript('window.localStorage.clear(); ' +
                                             'window.sessionStorage.clear();'))
           .then(done);
  });
});

function getBrowserLog() {
  return browser.manage().logs().get('browser').then((blog) =>
    // Remove source code locations " X " and " X:Y ", and trim lines.
    Array.from(new Set(
      blog.map((entry) =>
                 entry.message.replace(/ \d+:\d+ /, " ")
                              .replace(/ \d+ /, " ").trim())
          .filter((message) => message.indexOf('favicon.ico') < 0))));
}

function waitForWebPageToLoad(timeout) {
  console.log('Waiting for web page to load...'.blue.bold);
  return browser.wait(
    () => browser.executeScript(
      'return !!(window.J$ && window.J$.analysis) ? ' +
              '{ error: ' +
              '    window.J$.analysis.error instanceof Error ' +
              '      ? window.J$.analysis.error.message ' +
              '      : null, ' +
              '  isLoaded: window.J$.analysis.isLoaded }' +
              ': { error: null, isLoaded: false }')
      .then(({ error, isLoaded }) => {
        if (error) {
          throw error;
        }
        return sleep(1 * duration.SECOND).then(() => isLoaded);
      }),
    timeout);
}

function startAnalysis() {
  console.log('Starting analysis...'.blue.bold);
  return browser.executeScript('J$.analysis.startMode();');
}

function waitForAnalysisToFinish(timeout) {
  var start = Date.now();
  return browser.wait(() =>
    browser.executeScript(
      'return !!(window.J$ && window.J$.analysis) ? ' +
              '{ awaitingScreenshotTo: window.J$.analysis.awaitingScreenshotTo, ' +
              '  error: ' +
              '    window.J$.analysis.error instanceof Error ' +
              '      ? window.J$.analysis.error.message ' +
              '      : null, ' +
              '  isFinished: window.J$.analysis.isFinished } ' +
              ': { awaitingScreenshotTo: null, error: "J$.analysis is not defined", isFinished: false }')
      .then(({ awaitingScreenshotTo, error, isFinished }) => {
        console.log('Waiting for analysis to finish...');

        if (error !== null) {
          throw error;
        }

        if (typeof awaitingScreenshotTo === 'string') {
          // Take a screenshot, set `awaitingScreenshotTo` to null, and return
          // false to indicate that the analysis has still not finished.
          return oracle.takeScreenshot()
                       .then(writeTo(util.format('result-%s.png',
                                                 awaitingScreenshotTo)))
                       .then(() =>
                         browser.executeScript(
                           'window.J$.analysis.awaitingScreenshotTo = null;'))
                       .then(() => false);
        }
        return sleep(1 * duration.SECOND).then(() => isFinished);
      }),
    timeout)
  .then(() =>
    console.log(util.format("Done in %s seconds",
                            Math.round((Date.now() - start) / 1000))));
}

function outputAnalysisResults(timing) {
  console.log('Outputting analysis results...'.blue.bold);
  return Promise.all([
      browser.executeScript('return J$.analysis.getOutputAsString();')
             .then(JSON.parse),
      getBrowserLog()
    ])
    .then(([output, logs]) => {
      if (output.status === 'FAIL') {
        console.error(util.format('Runtime error: %s', output.error).red.bold);
      }

      output.logs = logs;
      output.timing = timing;

      return JSON.stringify(output, undefined, 2);
    })
    .then(writeTo('result.json', true))
    .then(() => {
      if (argv.screenshot) {
        return oracle.takeScreenshot()
                     .then(writeTo('result.png', true));
      }
    })
    .catch((e) => console.error(e.toString().red.bold, e.stack));
}

/**
 * Stores `data` at `out/site/result.json`.
 * Returns a promise that is resolved once `data` has been saved.
 */
function writeTo(filename, verbose) {
  return fileUtils.writeTo(path.join(root, 'out', argv.outputDir, filename),
                           verbose);
}

function sleep(duration) {
  return new Promise((resolve, reject) => setTimeout(resolve, duration));
}
