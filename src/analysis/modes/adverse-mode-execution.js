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
var argv = require('../argv.js');
var debugging = require('../../common/debugging.js');
var dom = require('../utils/dom.js');
var eventHandlerRegistrationMonitor = require('../monitors/event-handler-registration-monitor.js');
var eventMonitor = require('../monitors/event-monitor.js');
var Future = require('../stdlib/future.js');
var List = require('../stdlib/list.js');
var natives = require('../utils/natives.js');
var observationModeExecution = require('./observation-mode-execution.js');

// External
var util = require('util');

function AdverseModeExecution() {
  this.shouldBlockAjaxResponseEvents = true;
}

AdverseModeExecution.prototype.id = function () {
  return 'adverse-mode-execution';
};

function userEventListenerMatches(userEventListener, target, type) {
  return userEventListener.target === target &&
         userEventListener.type === type;
}

AdverseModeExecution.prototype.findUserEventListener =
    function (selector, staticId, target, type) {
  if (typeof selector === 'object') {
    var o = selector;
    return this.findUserEventListener(o.selector, o.staticId, o.target, o.type);
  }

  if (!target && typeof selector === 'string') {
    var possibleTargets = document.querySelectorAll(selector);
    if (possibleTargets.length === 1) {
      target = possibleTargets[0];
    }
  }

  if (staticId) {
    var element = natives.refs.document.querySelector.call(
      natives.refs.document.ref,
      util.format('[data-ajax-racer-id="%s"]', staticId));
    debugging.assertNe(element, null);

    var isExpectedElement = !target || element === target;
    if (isExpectedElement && dom.isVisible(element)) {
      var userEventListener =
        eventHandlerRegistrationMonitor.registeredUserEventListeners.find(
          (x) => x.target === element && x.type === type) || null;

      if (userEventListener !== null) {
        return userEventListener;
      }
    }
  }

  var userEventListener =
    eventHandlerRegistrationMonitor.registeredUserEventListeners.find(
      (x) => x.target instanceof natives.refs.HTMLElement.ref &&
             x.type === type && dom.isVisible(x.target) &&
             (x.target === target ||
              dom.getUniqueCssPath(x.target) === selector)) || null;

  if (userEventListener !== null) {
    return userEventListener;
  }

  // Check for event delegation.
  if (target instanceof natives.refs.HTMLElement.ref) {
    var originalTarget = target;
    while ((target = target.parentNode) !== null) {
      var userEventListener =
        eventHandlerRegistrationMonitor.registeredUserEventListeners.find(
          (userEventListener) =>
            userEventListenerMatches(userEventListener, target, type)
      ) || null;

      if (userEventListener !== null) {
        return userEventListener.forTarget(originalTarget);
      }
    }
  }

  // Give up.
  return null;
};

AdverseModeExecution.prototype.handlePrerequisites =
  observationModeExecution.handlePrerequisites;

AdverseModeExecution.prototype.findPrerequisite = function (prerequisite) {
  return this.findUserEventListener({
    target: document.querySelector(prerequisite.selector),
    type: prerequisite.type
  });
};

AdverseModeExecution.prototype.run = function (analysis, options) {
  var pair = argv.pairOfConflictingUserEventListeners;
  debugging.assert(typeof pair, 'object');

  var mode = this;

  var onPrerequisitesFinished = mode.handlePrerequisites(
    List.clone(pair.first.prerequisites || []).reverse());

  return onPrerequisitesFinished.then(() => {
    // Find the first user event listener.
    var userEventListener = mode.findUserEventListener(pair.first);

    // If the user event listener is not enabled, then fail.
    // TODO(christofferqa): Could execute a sequence of events in order to
    // enable the user event listener.
    if (!userEventListener) {
      console.error('Failed to execute first user event listener');
      return {
        id: argv.pairOfConflictingUserEventListeners.id,
        status: 'FAIL',
        error: 'Failed to execute first user event listener'
      };
    }

    var onScreenshotTaken =
      analysis.takeScreenshot('a')
              .then(dom.highlightElement(userEventListener.target));


    // Execute the first user event listener, and wait for it to finish before
    // proceeding.
    var onUserEventListenerExecutionFinished =
      onScreenshotTaken.then(() =>
        eventMonitor.createTrace(userEventListener,
                                 mode.shouldBlockAjaxResponseEvents));

    return onUserEventListenerExecutionFinished.then(() => {
      // By now, the first user event listener has finished, including all of
      // the events generated by that listener, except the Ajax response events.
      var onOtherPrerequisitesFinished = mode.handlePrerequisites(
        List.clone(pair.second.prerequisites || []).reverse());

      return onOtherPrerequisitesFinished.then(() => {
        var otherUserEventListener = mode.findUserEventListener(pair.second);

        // If the second user event listener is not enabled, then fail.
        if (!otherUserEventListener) {
          console.error('Failed to execute second user event listener');
          return {
            id: argv.pairOfConflictingUserEventListeners.id,
            status: 'FAIL',
            error: 'Failed to execute second user event listener'
          };
        }

        var onOtherScreenshotTaken =
          analysis.takeScreenshot('b')
                  .then(dom.highlightElement(otherUserEventListener.target));

        // Execute the second user event listener.
        var onOtherUserEventListenerFinished =
          onOtherScreenshotTaken.then(
            () => eventMonitor.createTrace(otherUserEventListener));

        // Execute the blocked events.
        var onBlockedEventsFinished =
          onOtherUserEventListenerFinished.then(
            () => eventMonitor.dispatchBlockedAjaxResponseEvents());

        return onBlockedEventsFinished.then((numPostponedEvents) => {
          var onPostProcessingFinished = Future.resolve();
          if (argv.config.postprocessing) {
            new List(argv.config.postprocessing).forEach((o) => {
              onPostProcessingFinished = onPostProcessingFinished.then(() => {
                if (typeof o === 'string') {
                  eval(o);
                  return;
                }
                if (typeof o.if === 'string') {
                  var skip = !eval(o.if);
                  if (skip) {
                    return;
                  }
                }
                var userEventListener = mode.findUserEventListener(o);
                return eventMonitor.createTrace(userEventListener, false);
              });
            });
          }

          return onPostProcessingFinished.then(() => {
            return {
              id: argv.pairOfConflictingUserEventListeners.id,
              numPostponedEvents: numPostponedEvents,
              status: 'SUCCESS'
            };
          });
        });
      });
    });
  });
};

module.exports = new AdverseModeExecution();
