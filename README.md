# AjaxRacer

## Prerequisites

* Node.js v8.9.4 (`npm install -g n; n 8.9.4`)
* Google Chrome (https://www.google.com/chrome)
* Graphviz v2.38.0
* http-server (`npm install -g http-server`)
* mitmproxy 0.17.1 (https://mitmproxy.org/)
* Protractor 5.2.0 (`npm install -g protractor@5.2.0`)
* wget (`brew install wget`)

The following dependencies are needed to build the website:

* Angular 1.4.1 (`npm install -g @angular/cli@1.4.1`)
* lite-server (`npm install -g lite-server`)


## Install instructions

Issue the following commands.
```
npm install
(cd report/; npm install)
```


## Usage

Example usage:
```
./ajaxracer.js --run-id foo \
  --url test/observation_mode_tests/nondeterministic_ui_ajax/index.html \
  --observation-mode --adverse-mode --generate-report
```

The argument passed to the `--run-id` option is simply an identifier for the run
(this identifier does not need to be unique - it merely specifies which
directory that should be used for the output).

The command runs observation mode on the given website (in this case, the URL is
automatically converted to http://localhost:8080/test/observation_mode_tests/nondeterministic_ui_ajax/index.html, because the path points to a
test on the disk). The result of the run is stored in the `out/foo/` directory.


## Results

The results of a run can be viewed in the browser by issuing the following
command and navigating to http://localhost:3000/:
```
npm run report
```

Note that it may take a while to compile the source files of the website from
TypeScript to JavaScript.


## Debugging

The script `./debug.sh` is useful for debugging. It automatically starts the
proxy server, and launches Google Chrome with proper flags for using the proxy
server to automatically instrument whatever website is visited.

This way it is possible to debug errors in the instrumentation and the dynamic
analysis using the developer toolbar in the browser.

It is possible to manually run observation mode once a web page has loaded in
debugging mode, by running the following command from the console in the
developer toolbar:
```
J$.analysis.startMode('observation-mode');
```


## End-to-end tests

Tests are available in the `test/` directory, and can be run using the following
command (this indirectly invokes the script `test/test.js`).
```
npm test
```

To run a single test, issue the following command:
```
npm test -- --filter "nondeterministic_ui_ajax/"
```

The outputs of the tests are created in the `out/` directory.
