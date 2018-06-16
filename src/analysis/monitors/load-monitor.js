// Internal
var { config, phase } = require('../argv.js');
var debugging = require('../../common/debugging.js');
var EmptyMonitor = require('./empty-monitor.js');
var EventCounter = require('../data-types/event-counter.js');
var logger = require('../dev/logger.js');
var natives = require('../utils/natives.js');
var TimerKind = require('../data-types/timer-kind.js');

// External
var util = require('util');

var nextId = 1;
function getNextId() {
  return nextId++;
}

function LoadMonitor() {
  this.counter = new EventCounter();
  this.isLoaded = false;
  this.lastNonTimerEvent = null;
  this.started = Date.now();

  // Wait for the window load event.
  var onloadLoadId = getNextId();
  this.counter.change(EventCounter.Category.LOAD, 1, onloadLoadId);

  natives.refs.EventTarget.addEventListener.call(window, 'load', function (e) {
    // Done waiting for the window load event.
    this.counter.change(EventCounter.Category.LOAD, -1, onloadLoadId);
    this.lastNonTimerEvent = Date.now();

    debugging.assert(!this.isLoaded);
  }.bind(this), true);
}

LoadMonitor.prototype = Object.create(EmptyMonitor.prototype);

LoadMonitor.prototype.id = function () {
  return 'load-monitor';
};

LoadMonitor.prototype.then = function (callback) {
  this.counter.then(function () {
    callback(Date.now() - this.started);
  }.bind(this));
};


// Scripts


LoadMonitor.prototype.onExitScript = function () {
  debugging.assert(!this.isLoaded);
};


// Ajax


LoadMonitor.prototype.onAjaxRequest = function (xhr, shadow) {
  if (!shadow.isCached) {
    // Wait for the Ajax response.
    shadow.loadId = getNextId();
    this.counter.change(EventCounter.Category.AJAX, 1, shadow.loadId);
  }
};

LoadMonitor.prototype.onAjaxAbort = function (xhr, shadow) {
  // Done waiting for the Ajax response.
  this.counter.change(EventCounter.Category.AJAX, -1, shadow.loadId);
  this.lastNonTimerEvent = Date.now();
};

LoadMonitor.prototype.onExitAjaxResponse =
    function (xhr, event, shadow, metadata) {
  if (!shadow.isCached && xhr.readyState === natives.refs.XMLHttpRequest.DONE) {
    var failed = xhr.status === 0;

    if (!failed) {
      if (event.type === 'load') {
        // Done waiting for the Ajax response.
        this.counter.change(EventCounter.Category.AJAX, -1, shadow.loadId);
        this.lastNonTimerEvent = Date.now();
      }
    } else {
      // Not done waiting for the Ajax response, until the error event handler
      // has executed.
    }
  }

  debugging.assert(!this.isLoaded);
};

LoadMonitor.prototype.onExitAjaxError = function (xhr, shadow, metadata) {
  // Done waiting for the Ajax response.
  this.counter.change(EventCounter.Category.AJAX, -1, shadow.loadId);
  this.lastNonTimerEvent = Date.now();

  debugging.assert(!this.isLoaded);
};


// Promises


if (config.waitForPromises) {
  LoadMonitor.prototype.onPromiseCreation =
      function (promiseId, shadow, readsResolveOrReject) {
    if (readsResolveOrReject) {
      shadow.isLoading = true;

      // Wait for the promise to resolve.
      this.counter.change(EventCounter.Category.PROMISE, 1, promiseId);

      // If no event handlers get assigned by the current event handler, then
      // there is no reason to wait for it to resolve, though.
      natives.refs.setTimeout.call(window, function () {
        if (shadow.isLoading &&
            shadow.thenEventHandlerEventIds.isEmpty() &&
            shadow.catchEventHandlerEventIds.isEmpty()) {
          logger.log(util.format(
            'Ignores promise with no event handlers (id: %s)', promiseId));
          this.counter.change(EventCounter.Category.PROMISE, -1, promiseId);
          this.lastNonTimerEvent = Date.now();

          shadow.isLoading = false;
        }
      }.bind(this), 0);
    }

    return { readsResolveOrReject: readsResolveOrReject };
  };

  LoadMonitor.prototype.onPromiseResolution =
      function (promiseId, shadow, options) {
    debugging.assertEq(typeof options.readsResolveOrReject, 'boolean');

    if (options.readsResolveOrReject) {
      // Done waiting for the promise to resolve.
      if (shadow.isLoading) {
        this.counter.change(EventCounter.Category.PROMISE, -1, promiseId);
        this.lastNonTimerEvent = Date.now();

        shadow.isLoading = false;
      } else {
        // No event handlers were assigned to the promise when the event handler
        // that created the promise terminated.
      }
    } else {
      debugging.assert(false,
        'A promise that did not appear to read resolve or reject somehow ' +
        'invoke one if them anyway.');
    }
  };
}


// Timers


LoadMonitor.prototype.onTimerCreation = function (timerId, kind, delay) {
  // Wait for the interval/timer to fire.
  var loadId = getNextId();
  this.counter.change(EventCounter.Category.TIMER, 1, loadId);

  // Return the id. It is automatically passed to `onEnterTimerCallback` or
  // `onTimerDeletion` below.
  return loadId;
};

LoadMonitor.prototype.onEnterTimerCallback =
    function (timerId, kind, loadId) {
  debugging.assertEq(typeof loadId, 'number');

  this.checkNotLoaded();

  if (kind !== TimerKind.INTERVAL) {
    // Done waiting for this timer.
    this.counter.change(EventCounter.Category.TIMER, -1, loadId);
  }
};

LoadMonitor.prototype.onExitTimerCallback = function () {
  debugging.assert(!this.isLoaded);
};

LoadMonitor.prototype.onTimerDeletion =
    function (timerId, kind, loadId) {
  debugging.assertEq(typeof loadId, 'number');

  // Done waiting for this interval/timer.
  this.counter.change(EventCounter.Category.TIMER, -1, loadId);
};


// Resources

LoadMonitor.prototype.onResourceRequest = function (url, shadow) {
  debugging.assertEq(typeof url, 'string');
  debugging.assertEq(typeof shadow, 'object');

  // If the same base object is already in the middle of loading a resource.
  if ('loadId' in shadow) {
    // Simulate that the last resource has finished loading.
    this.onResourceResponse(shadow.lastLoadedUrl, shadow, null);
  }

  // Wait for the resource to load.
  var loadId = getNextId();
  this.counter.change(EventCounter.Category.from(shadow.shadowed), 1, loadId,
                      { resourceUrl: url });

  shadow.loadId = loadId;
  shadow.lastLoadedUrl = url;
};

// TODO(christofferqa): This hook does not seem to work when the server
// responds with a 204 No Content status code. One solution might be to the
// status code to 200 from the proxy. There also seems to be issues when the
// browser has already cached a given resource.
LoadMonitor.prototype.onResourceResponse =
    function (url, shadow, error) {
  debugging.assertEq(typeof url, 'string');
  debugging.assertEq(typeof shadow, 'object');
  debugging.assertEq(typeof shadow.loadId, 'number');

  // Done waiting for the resource to load.
  this.counter.change(EventCounter.Category.from(shadow.shadowed), -1,
                      shadow.loadId, { resourceUrl: url });
  this.lastNonTimerEvent = Date.now();

  delete shadow.loadId;

  debugging.assert(!this.isLoaded);
};


// Others


LoadMonitor.prototype.onExitEventListener = function () {
  debugging.assert(!this.isLoaded);
};


// Debugging


// Fail if an event happens once the page has loaded. This should only happen
// if a user event is performed.
LoadMonitor.prototype.checkNotLoaded = function () {
  debugging.assert(phase.get() !== phase.DEBUGGING || !this.isLoaded);
};

if (phase.get() === phase.DEBUGGING) {
  LoadMonitor.prototype.onEnterScript = LoadMonitor.prototype.checkNotLoaded;
  LoadMonitor.prototype.onEnterAjaxResponse = LoadMonitor.prototype.checkNotLoaded;
  LoadMonitor.prototype.onEnterAjaxError = LoadMonitor.prototype.checkNotLoaded;
  LoadMonitor.prototype.onEnterEventListener = LoadMonitor.prototype.checkNotLoaded;
}


module.exports = new LoadMonitor();
