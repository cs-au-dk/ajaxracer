# AjaxRacer

## Install Instructions

See [INSTALL.md](INSTALL.md).


## Getting started

Consider the web page in the directory `test/ajax_nondeterministic_ui/`. This example illustrates the essence of an observable AJAX race.


### Running AjaxRacer

AjaxRacer can be applied to the page at `test/ajax_nondeterministic_ui/` by issuing the following command:

`./ajaxracer.js --run-id test --url test/ajax_nondeterministic_ui/index.html`

Note:

* The argument passed to the `--run-id` option is simply an identifier for the run. It merely specifies which directory that should be used for the output and does not need to be unique. In this case, the result of the run is stored in the `out/test/` directory.

* The URL is automatically converted to <http://localhost:8080/test/observation_mode_tests/nondeterministic_ui_ajax/index.html> as the path points to a test on the disk (AjaxRacer starts an HTTP server on port 8080 on its own).

* By default, AjaxRacer uses a headless instance of Google Chrome. This can be circumvented by passing the flag `--no-headless`. This is mostly intended for testing purposes, though.


### Overview

When executing the `./ajaxracer.js` command, the following happens:

1. Phase 1 of AjaxRacer is run (described in [1]) using the script in `src/phases/phase-1.js`.

   This script starts a proxy server on port 8081 (using `src/utils/proxy.js`). The proxy server dynamically intercepts and instruments HTML and JavaScript source files (see `instrumentation_server/proxy.py`). The actual instrumentation is carried out by `src/instrumentation/instrument-html.js` and `src/instrumentation/instrument-js.js`.

   When the proxy server has been started, the web page is loaded in Google Chrome using the Protractor testing framework (using `src/utils/protractor.js`). The interaction with the web page is carried out by the Protractor test script `driver/spec.js`. This script waits for the web application to load, and then sends a message to the web application that will generate a trace for every event handler. This is carried out by the analysis that is injected into the web application by the instrumentation. The key components responsible for generating the traces are `src/analysis/analysis.js`, `src/analysis/modes/observation-mode-execution.js`, and `src/analysis/monitors/event-monitor.js`.

   Finally, the results are stored by `driver/spec.js` to the disk.

2. Phase 2 of AjaxRacer is run using the script in `src/phases/phase-2.js`.

   This script will analyze the traces from Phase 1 to find "potentially AJAX conflicting pairs of user event handlers". For each such pair, the script runs the given pair of user event handlers in "synchronous" mode and "adverse" mode [1]. This involves starting a proxy server and loading the web application in the browser using the Protractor testing framework, similar to the way Phase 1 works.

   Unlike in Phase 1, though, the Protractor test script `driver/spec.js` will cause `src/analysis/modes/adverse-mode-execution.js` and `src/analysis/modes/synchronous-mode-execution.js` to run in the browser.


### Viewing the results

The results of the run can be viewed in the browser by issuing the command `npm run report`. This command will compile the TypeScript source files in the `report/` directory to JavaScript, which may take a few minutes. Afterwards, the results will be available at <http://localhost:3000/>.

Note that it is only necessary to run this command once: if AjaxRacer is applied to a website *after* this command is run, the results will automatically become available at <http://localhost:3000/>, if the page is reloaded.

The generated report should look similar to the one that was automatically generated for the experiments from [1]. This report is available at <http://ajaxracer.casadev.cs.au.dk/>.


## Experiments

The experiments from [1] can be run by issuing the following command (note that this takes several hours):

`./run-experiments.js`

This script is essentially just a wrapper around `./ajaxracer.js`. For example, to run the experiments for the web page "Customize your MacBook" on <https://www.apple.com/>, one can issue one of the following commands:

`./ajaxracer.js --run-id apple-customize-macbook --url "https://www.apple.com/shop/buy-mac/macbook?product=MNYF2LL/A&step=config"`

or

`./run-experiments.js --filter apple-customize-macbook`


## End-to-end tests

AjaxRacer comes with a set of tests in the `test/` directory. These tests can be run using the following command (this indirectly invokes the script `test/test.js`):

`npm test`

To run only tests that matches "nondeterministic_ui_ajax/", one can issue the following command:

`npm test -- --filter "nondeterministic_ui_ajax/"`

The traces that result from executing the tests will be output to the `out/` directory, and will be compared to the expected traces, which are stored in `expected.json` files.


## Debugging

The script `./debug.sh` is useful for debugging. It automatically starts the proxy server and launches Google Chrome with proper flags for using the proxy server to automatically instrument whatever website is visited.

This way it is possible to debug errors in the instrumentation and the dynamic analysis using the developer toolbar in the browser.

## References

[1] Practical AJAX Race Detection for JavaScript Web Applications (FSE 2018)
