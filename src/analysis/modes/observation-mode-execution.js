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
var config = require('../argv.js').config;
var eventHandlerRegistrationMonitor = require('../monitors/event-handler-registration-monitor.js');
var eventMonitor = require('../monitors/event-monitor.js');
var debugging = require('../../common/debugging.js');
var dom = require('../utils/dom.js');
var Future = require('../stdlib/future.js');
var List = require('../stdlib/list.js');
var natives = require('../utils/natives.js');

// External
var util = require('util');

function ObservationModeExecution() {
  this.manualEventSequence = null;
  this.registeredUserEventListeners = null;
}

ObservationModeExecution.prototype.id = function () {
  return 'observation-mode-execution';
};

ObservationModeExecution.prototype.initialize = function (options) {
  this.registeredUserEventListeners =
    List.clone(eventHandlerRegistrationMonitor.registeredUserEventListeners);
  debugging.assert(this.registeredUserEventListeners instanceof List);

  // Get the manually specified event sequence, if any.
  if (options && options.manualEventSequence instanceof Array) {
    this.manualEventSequence = List.clone(options.manualEventSequence).reverse();
  } else if (config.manualEventSequence instanceof Array) {
    this.manualEventSequence = List.clone(config.manualEventSequence).reverse();
  } else {
    this.manualEventSequence = null;
  }
};

function userEventListenerMatches(userEventListener, selector, target, type) {
  return userEventListener.target === target &&
         userEventListener.type === type;
}

ObservationModeExecution.prototype.findUserEventListener =
    function (selector, type) {
  var target = document.querySelector(selector);
  debugging.assertNe(target, null, util.format(
    'Unable to find element that matches the selector "%s"', selector));

  var userEventListener =
    eventHandlerRegistrationMonitor.registeredUserEventListeners.find(
      (userEventListener) =>
        userEventListenerMatches(userEventListener, selector, target, type)
    ) || null;

  if (userEventListener !== null) {
    return userEventListener.forTarget(target);
  }

  // Check for event delegation.
  var originalTarget = target;
  while ((target = target.parentNode) !== null) {
    var userEventListener =
      eventHandlerRegistrationMonitor.registeredUserEventListeners.find(
        (userEventListener) =>
          userEventListenerMatches(userEventListener, selector, target, type)
    ) || null;

    if (userEventListener !== null) {
      return userEventListener.forTarget(originalTarget);
    }
  }

  debugging.assertUnreachable();
};

ObservationModeExecution.prototype.handlePrerequisites =
    function (prerequisites) {
  if (prerequisites.isEmpty()) {
    // Done executing prerequisites.
    return Future.resolve(null);
  }

  // Execute next prerequisite.
  var prerequisite = prerequisites.pop();

  if (typeof prerequisite.if === 'string') {
    try {
      var skip = !eval(prerequisite.if);
      if (skip) {
        // Continue executing the remaining prerequisites.
        return this.handlePrerequisites(prerequisites);
      }
    } catch (e) {
    }
  }

  // If it is a 'set-index', 'set-text', or 'toggle' event,
  // then set the value of the corresponding HTML form element.
  if (prerequisite.type === 'scroll' ||
      prerequisite.type === 'set-index' ||
      prerequisite.type === 'set-text' ||
      prerequisite.type === 'toggle') {
    if (prerequisite.type === 'scroll') {
      natives.refs.scroll.call(window, prerequisite.x, prerequisite.y);
    } else {
      var element = document.querySelector(prerequisite.selector);
      debugging.assertNe(element, null);

      switch (prerequisite.type) {
        case 'set-index':
          debugging.assertEq(typeof prerequisite.value, 'number');
          element.selectedIndex = prerequisite.value;
          break;

        case 'set-text':
          debugging.assertEq(typeof prerequisite.value, 'string');
          element.value = prerequisite.value;
          break;

        case 'toggle':
          element.checked = !element.checked;
          break;

        default:
          debugging.assertUnreachable();
      }
    }

    // Continue executing the remaining prerequisites.
    return this.handlePrerequisites(prerequisites);
  }

  var userEventListener = this.findPrerequisite(prerequisite);
  debugging.assertNe(userEventListener, null);

  return eventMonitor
    .createTrace(userEventListener)
    .then(function () {
      return this.handlePrerequisites(prerequisites);
    }.bind(this));
};

ObservationModeExecution.prototype.findPrerequisite = function (prerequisite) {
  return this.findUserEventListener(prerequisite.selector, prerequisite.type);
};

// When running in mode = DEBUGGING, it is possible to open the developer
// toolbar, and run:
//   J$.analysis.startMode('observation-mode',
//                         { min: ..., max: ..., which: ... })
//
// This makes it possible to test the analysis of registered user event
// handlers one at a time.
ObservationModeExecution.prototype.popUserEventListener = function () {
  if (this.manualEventSequence !== null) {
    if (this.manualEventSequence.isEmpty()) {
      // No more event listeners to analyze.
      return Future.resolve(null);
    }

    var descriptor = this.manualEventSequence.pop();
    var { selector, type } = descriptor;
    var prerequisites = List.clone(descriptor.prerequisites || []).reverse();

    var onPrerequisitesHandled = this.handlePrerequisites(prerequisites)

    return onPrerequisitesHandled.then(function () {
      var userEventListener =
        this.findUserEventListener(selector, type)
            .forSelector(selector);
      if (descriptor.description) {
        userEventListener =
          userEventListener.withDescription(descriptor.description);
      }
      if (descriptor.event) {
        userEventListener = userEventListener.withEvent(descriptor.event);
      }
      if (descriptor.prerequisites) {
        userEventListener =
          userEventListener.withPrerequisites(descriptor.prerequisites);
      }
      return userEventListener;
    }.bind(this));
  }

  var i = this.registeredUserEventListeners.findIndex((x, i) =>
    /* is an HTML element */
    x.target instanceof natives.refs.HTMLElement.ref &&
    /* which is visible */
    dom.isVisible(x.target) &&
    /* which matches the query specified by `options`, if any */
    !(typeof options === 'object' && (
        (typeof options.predicate === 'function' && !options.predicate(x)) ||
        (typeof options.min === 'number' && i < options.min) ||
        (typeof options.max === 'number' && i > options.max) ||
        (typeof options.which === 'number' && i !== options.which))));

  var result = null;
  if (i >= 0) {
    result = this.registeredUserEventListeners.get(i);

    // Delete user event listener from `registeredUserEventListeners`.
    this.registeredUserEventListeners.splice(i, 1);
  }
  return Future.resolve(result);
};

ObservationModeExecution.prototype.analyzeNextUserEventListener =
    function (traces, shouldSleep) {
  debugging.assert(traces instanceof List);

  var mode = this;
  return mode.popUserEventListener().then((userEventListener) => {
    if (userEventListener !== null) {
      var onReady = null;
      if (shouldSleep) {
        // Promise that resolves in 500ms.
        onReady = new Future((resolve, reject) => {
          natives.refs.setTimeout.call(window, resolve, 500);
        });
      } else {
        onReady = Future.resolve();
      }

      return onReady.then(() => eventMonitor.createTrace(userEventListener))
                    .then((trace) => {
                      traces.push(trace);
                      return mode.analyzeNextUserEventListener(traces, true);
                    });
    }
    return Future.resolve({ userEventListeners: traces });
  });
};

/**
 * This function produces a trace for every user event handler that has been
 * registered during the loading of the web page.
 *
 * Returns a promise that resolves to the generated traces.
 */
ObservationModeExecution.prototype.run = function (analysis, options) {
  this.initialize(options);

  // Analyze the user event handlers.
  var traces = new List([]);
  return this.analyzeNextUserEventListener(traces, false);
};

module.exports = new ObservationModeExecution();
