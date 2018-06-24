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
var { config } = require('../argv.js');
var debugging = require('../../common/debugging.js');
var List = require('../stdlib/list.js');
var loadMonitor = require('../monitors/load-monitor.js');
var logger = require('../dev/logger.js');
var misc = require('../utils/misc.js');
var natives = require('../utils/natives.js');
var symbols = require('../utils/symbols.js');
var TimerKind = require('../data-types/timer-kind.js');

// External
var util = require('util');

function install(analysis) {
  var timerStateOfCurrentlyExecutingEvent = null;

  function looksLikePageHasLoaded() {
    return (document.readyState === 'complete' &&
      config.forceLoadingAfterWindowLoad) || (
        loadMonitor.lastNonTimerEvent !== null &&
        Date.now() - loadMonitor.lastNonTimerEvent >= 15 * 1000);
  }

  function interceptTimerCreation(interceptedFunction, state, kind,
                                  precondition) {
    var isInterval = kind === TimerKind.INTERVAL;

    return function (x, y) {
      if (typeof precondition === 'function') {
        precondition(arguments);
      }

      // Convert `x` to a function if it is a string.
      var callback = x;
      if (typeof callback === 'string') {
        var code = callback;
        var indirectEval = eval;
        callback = () => indirectEval(code);
      }

      var delay = y;
      if (interceptedFunction === natives.refs.setInterval ||
          interceptedFunction === natives.refs.setTimeout) {
        if (typeof delay !== 'number') {
          delay = 0;
        }

        if (looksLikePageHasLoaded() && !analysis.isLoaded) {
          logger.warn('Ignoring timer registration because it looks like the ' +
                      'page has loaded');
          var randomTimerId = Math.floor(Math.random() * 1000000);
          return randomTimerId;
        }

        if (delay >= config.maxTimerDuration) {
          logger.warn(
            util.format('Ignoring timer registration with delay=%s', delay));
          var randomTimerId = Math.floor(Math.random() * 1000000);
          return randomTimerId;
        }

        if (config.skipTimerRegistrations ||
            (isInterval && config.skipIntervalRegistrations)) {
          var source = natives.refs.Function.toString.call(callback);
          var patterns = new List();
          if (config.skipTimerRegistrations) {
            new List(config.skipTimerRegistrations).forEach(
              (x) => patterns.push(x));
          }
          if (isInterval && config.skipIntervalRegistrations) {
            new List(config.skipIntervalRegistrations).forEach(
              (x) => patterns.push(x));
          }

          var skip = patterns.some((pattern) => source.match(pattern) !== null);
          if (skip) {
            logger.warn('Skipping timer registration according to config');
            var randomTimerId = Math.floor(Math.random() * 1000000);
            return randomTimerId;
          }
        }
      }

      var numConsecutivePrecedingTimers =
        timerStateOfCurrentlyExecutingEvent !== null
          ? timerStateOfCurrentlyExecutingEvent.timerChainLength
          : 0;
      if (config.maxTimerChainLength >= 0 &&
          numConsecutivePrecedingTimers >= config.maxTimerChainLength) {
        logger.warn(
          util.format('Ignoring timer registration that would invalidate the ' +
                        'maximum allowed length (%s) of a timer chain',
                      config.maxTimerChainLength));
        var randomTimerId = Math.floor(Math.random() * 1000000);
        return randomTimerId;
      }

      // Create wrapper function. Note that this also mutates the variable `x`.
      arguments[0] = misc.makeWrapper(function () {
        var timerState = state[timerId];
        var exitOptions =
          analysis.notify('onEnterTimerCallback', [timerId, kind],
                          timerState.options);

        // About to invoke the callback function.
        timerStateOfCurrentlyExecutingEvent = timerState;

        if (isInterval) {
          timerState.timerChainLength += 1;

          if (looksLikePageHasLoaded() && !analysis.isLoaded) {
            logger.warn('Deleting interval because it looks like the ' +
                        'page has loaded');

            // Simulate that the web application calls clearInterval itself.
            instrumentedClearInterval(timerId);
          }

          // Delete the interval if the next timer event is going to
          // invalidate the maximum allowed chain length.
          if (config.maxTimerChainLength >= 0 &&
              timerState.timerChainLength >= config.maxTimerChainLength) {
            logger.warn(
              util.format('Deleting interval that would invalidate the ' +
                            'maximum allowed chain length (%s)',
                          config.maxTimerChainLength));

            // Simulate that the web application calls clearInterval itself.
            instrumentedClearInterval(timerId);
          }
        } else {
          // Record that `timerId` no longer denotes an active timer.
          // This must be done before calling `callback`, because that function
          // might invoke `clearTimeout` (in which case we should not emit a
          // `onTimerDeletion` notification).
          delete state[timerId];
        }

        try {
          callback.apply(this, arguments);
        } finally {
          // Done invoking the callback function.
          timerStateOfCurrentlyExecutingEvent = null;

          analysis.notify('onExitTimerCallback', [timerId, kind],
                          exitOptions);
        }
      });

      var timerId = interceptedFunction.apply(window, arguments);

      state[timerId] = {
        timerChainLength: numConsecutivePrecedingTimers + 1,
        options:
          analysis.notify('onTimerCreation', [timerId, kind, delay])
      };

      return timerId;
    };
  }

  function interceptTimerDeletion(interceptedFunction, state, kind) {
    return function (timerId) {
      var shadow = state[timerId];
      if (typeof shadow === 'undefined') {
        // No such timer.
        return;
      }

      debugging.assertEq(typeof shadow, 'object');

      // Stop the interval.
      interceptedFunction.call(window, timerId);

      // Record that `timerId` no longer denotes an active interval.
      delete state[timerId];

      // Notify monitors.
      analysis.notify('onTimerDeletion', [timerId, kind], shadow.options);
    };
  }

  var animationFrameRequests = {};
  var idleCallbackRequests = {};
  var immediates = {};
  var intervals = {};
  var timers = {}

  // Intercept timer creations.
  window.requestAnimationFrame = interceptTimerCreation(
    /*interceptedFunction=*/natives.refs.requestAnimationFrame,
    /*state=*/animationFrameRequests,
    /*kind=*/TimerKind.ANIMATION_FRAME_REQUEST);

  window.requestIdleCallback = interceptTimerCreation(
    /*interceptedFunction=*/natives.refs.requestIdleCallback,
    /*state=*/idleCallbackRequests, /*kind=*/TimerKind.IDLE_CALLBACK_REQUEST,
    /*precondition=*/(args) => debugging.assert(args.length <= 2));

  window.setInterval = interceptTimerCreation(
    /*interceptedFunction=*/natives.refs.setInterval,
    /*state=*/intervals, /*kind=*/TimerKind.INTERVAL);

  window.setTimeout = interceptTimerCreation(
    /*interceptedFunction=*/natives.refs.setTimeout,
    /*state=*/timers, /*kind=*/TimerKind.TIMER);

  if (typeof natives.refs.setImmediate === 'function') {
    window.setImmediate = interceptTimerCreation(
      /*interceptedFunction=*/natives.refs.setImmediate,
      /*state=*/immediates, /*kind=*/TimerKind.IMMEDIATE_TIMER,
      /*precondition=*/(args) => debugging.assert(args.length <= 1));
  }

  // Intercept timer deletions.
  window.cancelAnimationFrame = interceptTimerDeletion(
    /*interceptedFunction=*/natives.refs.cancelAnimationFrame,
    /*state=*/animationFrameRequests,
    /*kind=*/TimerKind.ANIMATION_FRAME_REQUEST);

  window.cancelIdleCallback = interceptTimerDeletion(
    /*interceptedFunction=*/natives.refs.cancelIdleCallback,
    /*state=*/idleCallbackRequests, /*kind=*/TimerKind.IDLE_CALLBACK_REQUEST);

  var instrumentedClearInterval = interceptTimerDeletion(
    /*interceptedFunction=*/natives.refs.clearInterval,
    /*state=*/intervals, /*kind=*/TimerKind.INTERVAL);
  window.clearInterval = instrumentedClearInterval;

  window.clearTimeout = interceptTimerDeletion(
    /*interceptedFunction=*/natives.refs.clearTimeout,
    /*state=*/timers, /*kind=*/TimerKind.TIMER);

  if (typeof natives.refs.clearImmediate === 'function') {
    window.clearImmediate = interceptTimerDeletion(
      /*interceptedFunction=*/natives.refs.clearImmediate,
      /*state=*/immediates, /*kind=*/TimerKind.IMMEDIATE_TIMER);
  }
}

module.exports = {
  install: install,
  TimerKind: TimerKind
};
