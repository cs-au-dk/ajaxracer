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
var { phase } = require('../argv.js');
var debugging = require('../../common/debugging.js');
var dom = require('../utils/dom.js');
var EmptyMonitor = require('../monitors/empty-monitor.js');
var EventCounter = require('../data-types/event-counter.js');
var EventId = require('../data-types/event-id.js');
var Future = require('../stdlib/future.js');
var List = require('../stdlib/list.js');
var logger = require('../dev/logger.js');
var misc = require('../utils/misc.js');
var natives = require('../utils/natives.js');
var symbols = require('../utils/symbols.js');
var TimerKind = require('../data-types/timer-kind.js');
var Trace = require('../data-types/trace.js');
var UserEventListener = require('../data-types/user-event-listener.js');

// External
var util = require('util');

var PromiseState = {
  FULFILLED: 'fulfilled',
  PENDING: 'pending',
  REJECTED: 'rejected'
};

function EventMonitor() {
  this.assertApplicationIsInactive = false;
  this.blockedAjaxResponseEvents = new List();
  this.counter = null;
  this.currentEvent = null;
  this.currentScript = null;
  this.intervals = {};
  this.nextEventId = 1;
  this.shouldBlockAjaxResponseEvents = false;
  this.trace = null;
}

EventMonitor.prototype = Object.create(EmptyMonitor.prototype);

EventMonitor.prototype.id = function () {
  return 'event-monitor';
};

EventMonitor.prototype.getCurrentScript = function () {
  if (document.currentScript instanceof natives.refs.HTMLScriptElement.ref) {
    return document.currentScript;
  }
  if (this.currentScript instanceof natives.refs.HTMLScriptElement.ref) {
    return this.currentScript;
  }
  return null;
};


// Scripts


EventMonitor.prototype.onEnterScript = function (originalFileName) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assertEq(this.currentEvent, null);

  var currentScript = this.getCurrentScript();
  var shadow = null;
  if (currentScript !== null) {
    shadow = misc.getShadow(currentScript);
  }

  if (shadow !== null && shadow.resourceResponseEventId instanceof EventId) {
    this.currentEvent = shadow.resourceResponseEventId;
  } else {
    this.currentEvent = new EventId();
  }

  logger.log(util.format('ENTER-SCRIPT %s (url: %s)',
    this.currentEvent.id(),
    originalFileName.substring(originalFileName.lastIndexOf('/') + 1)));
};

EventMonitor.prototype.onExitScript = function () {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  logger.log(util.format('EXIT-SCRIPT %s', this.currentEvent.id()));

  this.currentEvent = null;
};

EventMonitor.prototype.shouldBlockCurrentScript = function (executor) {
  var monitor = this;

  var script = document.currentScript;

  if (this.shouldBlockAjaxResponseEvents &&
      script instanceof natives.refs.HTMLScriptElement.ref &&
      script.async) {
    var shadow = misc.getShadow(script);
    debugging.assertEq(typeof shadow, 'object');
    debugging.assert(shadow.resourceResponseEventId instanceof EventId);

    logger.log(
      util.format('Blocking the execution of script (event id: %s, src: %s)',
                  shadow.resourceResponseEventId.id(), script.src));

    // Record that the execution of the script has been blocked.
    // This makes it possible to execute the script later.
    this.blockedAjaxResponseEvents.push({
      isAjaxEvent: false,
      isLoadEvent: false,
      isScript: true,
      isScriptEvent: false,
      dispatcher: () => {
        monitor.currentScript = script;
        try {
          executor();
        } finally {
          monitor.currentScript = null
        }
      }
    });

    if (this.trace !== null) {
      // Done waiting for script.
      this.counter.change(EventCounter.Category.RESOURCE_SCRIPT, -1);
    }

    return true;
  }
  return false;
};

EventMonitor.prototype.shouldBlockScriptResponse =
    function (script, args, listener) {
  var monitor = this;

  if (this.shouldBlockAjaxResponseEvents &&
      script instanceof natives.refs.HTMLScriptElement.ref &&
      script.async) {
    var event = args[0];

    var shadow = misc.getShadow(script);
    debugging.assertEq(typeof shadow, 'object');
    debugging.assert(shadow.resourceResponseEventId instanceof EventId);

    logger.log(
      util.format('Blocking script response event (event id: %s, type: %s)',
                  shadow.resourceResponseEventId.id(), event.type));

    // Record that the execution of the event listener has been blocked.
    // This makes it possible to execute the event listener later.
    this.blockedAjaxResponseEvents.push({
      isAjaxEvent: false,
      isLoadEvent: event.type === 'load',
      isScript: false,
      isScriptEvent: true,
      dispatcher: () => listener.apply(script, args)
    });

    return true;
  }
  return false;
};


// Ajax


EventMonitor.prototype.onAjaxRequest = function (xhr, shadow) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);
  shadow.predecessor = this.currentEvent;

  debugging.assertEq(typeof shadow, 'object');
  debugging.assertEq(typeof shadow.isAsync, 'boolean');
  debugging.assertEq(typeof shadow.isCached, 'boolean');
  debugging.assertEq(typeof shadow.url, 'string');

  logger.log(util.format('AJAX-REQUEST (async: %s, url: %s)',
                         shadow.isAsync, shadow.url));

  if (shadow.isAsync && !shadow.isCached) {
    var firstReadyStateChangeEventId = new EventId();

    if (this.trace !== null) {
      // Update the trace.
      var metadata = { method: shadow.method,
                       url: misc.toAbsoluteUrl(shadow.url) };
      this.trace.fork(this.currentEvent, firstReadyStateChangeEventId,
                      Trace.ForkKind.AJAX_REQUEST, metadata);

      // We have to wait for the Ajax load event (the Ajax load event always
      // happens after the last readystatechange event).
      this.counter.change(EventCounter.Category.AJAX, 1);
    }

    shadow.firstReadyStateChangeEventId = firstReadyStateChangeEventId;
  }
};

EventMonitor.prototype.onAjaxAbort = function (xhr, shadow, explicit) {
  var monitor = this;

  if (this.trace !== null) {
    if (shadow.isActive) {
      monitor.counter.change(EventCounter.Category.AJAX, -1);
    }
  }

  if (this.blockedAjaxResponseEvents.length > 0) {
    this.blockedAjaxResponseEvents = this.blockedAjaxResponseEvents.map((x) => {
      if (!x.isAjaxEvent || x.xhr !== xhr) {
        // This event has not been aborted, so keep it as it is.
        return x;
      }

      // Replace the listener by a no-op. It is important not to filter (as
      // opposed to mapping), due to the handling in
      // `dispatchBlockedAjaxResponseEvents`.
      return {
        isAjaxEvent: true,
        isLoadEvent: x.isLoadEvent,
        isScript: false,
        isScriptEvent: false,
        dispatcher: () => {
          // Done waiting for the Ajax response event.
          if (x.isLoadEvent) {
            shadow.isResponseDispatched = true;
            monitor.counter.change(EventCounter.Category.AJAX, -1);
          }
        },
        xhr: x.xhr
      };
    });
  }
};

EventMonitor.prototype.shouldBlockAjaxResponse =
    function (xhr, args, listener) {
  if (this.shouldBlockAjaxResponseEvents) {
    var event = args[0];

    logger.log(
      util.format('Blocking Ajax response event (type: %s, readyState: %s)',
                  event.type, xhr.readyState));

    // Record that the execution of the event listener has been blocked.
    // This makes it possible to execute the event listener later.
    var oldReadyState = xhr.readyState;
    this.blockedAjaxResponseEvents.push({
      isAjaxEvent: true,
      isLoadEvent: event.type === 'load',
      isScript: false,
      isScriptEvent: false,
      dispatcher: () => {
        var newReadyState = xhr.readyState;
        try {
          // Use defineProperty since the `readyState` property is not writable.
          natives.refs.Object.defineProperty.call(
            natives.refs.Object.ref, xhr, 'readyState',
            { value: oldReadyState, writable: true });
          listener.apply(xhr, args);
        } finally {
          xhr.readyState = newReadyState;
        }
      },
      xhr: xhr
    });

    if (this.trace !== null) {
      if (event.type === 'load') {
        // Done waiting for Ajax response event.
        this.counter.change(EventCounter.Category.AJAX, -1);
      }
    }

    // Note that, at this point, this.shouldBlockAjaxResponseEvents may have
    // become false due to the call to adjustOutstanding(-1).
    return true;
  }
  return false;
};

EventMonitor.prototype.onEnterAjaxResponse = function (xhr, event, shadow) {
  debugging.assertEq(typeof shadow, 'object');
  debugging.assertEq(typeof shadow.url, 'string');
  debugging.assert(!this.assertApplicationIsInactive);

  logger.logIf(event.type === 'load',
               util.format('AJAX-RESPONSE (url: %s)', shadow.url));

  var isAsync = this.currentEvent === null;
  if (isAsync) {
    var predecessor = shadow.predecessor;
    debugging.assert(predecessor instanceof EventId);

    switch (event.type) {
      case 'load':
        // Create a new event ID for this Ajax load event.
        this.currentEvent = new EventId();
        break;

      case 'progress':
        // Create a new event ID for this Ajax progress event.
        this.currentEvent = new EventId();
        break;

      case 'readystatechange':
        if (shadow.firstReadyStateChangeEventId !== null) {
          // Use the event ID that was generated when the request was made.
          this.currentEvent = shadow.firstReadyStateChangeEventId;
          shadow.firstReadyStateChangeEventId = null;
        } else {
          // Create a new event ID for this Ajax readystatechange event.
          this.currentEvent = new EventId();
        }
        break;

      default:
        debugging.assertUnreachable();
    }

    logger.log(util.format('ENTER-AJAX %s (pred: %s)',
                           this.currentEvent.id(), predecessor.id()), xhr);

    if (this.trace !== null) {
      this.trace.join(this.currentEvent, predecessor,
                      Trace.JoinKind.forXHR(xhr, event));
    }
  }

  return { isAsync: isAsync };
};

EventMonitor.prototype.onExitAjaxResponse =
    function (xhr, event, shadow, metadata) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  if (event.type === 'load') {
    shadow.isResponseDispatched = true;
  }

  if (metadata.isAsync) {
    logger.log(util.format('EXIT-AJAX %s', this.currentEvent.id()), xhr);

    if (this.trace !== null) {
      // The predecessor of the next response event is the current one.
      shadow.predecessor = this.currentEvent;

      if (event.type === 'load') {
        // Done waiting for the Ajax response.
        this.counter.change(EventCounter.Category.AJAX, -1);
      }
    }

    this.currentEvent = null;
  }
};

EventMonitor.prototype.onEnterAjaxError = function (xhr, event, shadow) {
  debugging.assertEq(event.type, 'error');
  debugging.assertEq(typeof shadow, 'object');
  debugging.assertEq(typeof shadow.url, 'string');
  debugging.assert(!this.assertApplicationIsInactive);

  var isAsync = this.currentEvent === null;
  if (isAsync) {
    var predecessor = shadow.predecessor;
    debugging.assert(predecessor instanceof EventId);

    // Create a new event ID for this Ajax error event.
    this.currentEvent = new EventId();

    logger.log(util.format('ENTER-AJAX-ERROR %s (pred: %s)',
                           this.currentEvent.id(), predecessor.id()), xhr);

    if (this.trace !== null) {
      this.trace.join(this.currentEvent, predecessor,
                      Trace.JoinKind.forXHR(xhr, event));
    }
  }

  return { isAsync: isAsync };
};

EventMonitor.prototype.onExitAjaxError = function (
    xhr, event, shadow, metadata) {
  debugging.assertEq(event.type, 'error');
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  shadow.isResponseDispatched = true;

  if (metadata.isAsync) {
    logger.log(util.format('EXIT-AJAX-ERROR %s', this.currentEvent.id()), xhr);

    if (this.trace !== null) {
      // The predecessor of the next response event is the current one.
      shadow.predecessor = this.currentEvent;

      // Done waiting for the Ajax response.
      this.counter.change(EventCounter.Category.AJAX, -1);
    }

    this.currentEvent = null;
  }
};


// Timers


EventMonitor.prototype.onTimerCreation = function (timerId, kind, delay) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  // Create an event ID for the future timer event.
  var timerEventId = new EventId();

  if (this.trace !== null) {
    logger.log(util.format('CREATE %s', kind.toUpperCase()));

    // Update the trace.
    var metadata = null;
    if (kind === TimerKind.INTERVAL || kind === TimerKind.TIMER) {
      metadata = { delay: delay };
    }

    this.trace.fork(this.currentEvent, timerEventId,
                    Trace.ForkKind.fromTimerKind(kind), metadata);

    // We have to wait for the timer to fire.
    // TODO: Does not terminate if there is an infinite chain of timer events.
    this.counter.change(EventCounter.Category.TIMER, 1, timerEventId);
  }

  if (kind === TimerKind.INTERVAL) {
    this.intervals[timerId] = {
      nextIntervalEventId: timerEventId,
      predecessor: this.currentEvent
    };
    return { predecessor: this.currentEvent };
  }

  return { nextEventId: timerEventId, predecessor: this.currentEvent };
};

EventMonitor.prototype.onTimerDeletion =
    function (timerId, kind, metadata) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  if (kind === TimerKind.INTERVAL) {
    if (this.counter !== null) {
      var cancelledEvent = this.intervals[timerId].nextIntervalEventId;
      this.trace.cancel(this.currentEvent, cancelledEvent);

      // Done waiting for the interval.
      this.counter.change(EventCounter.Category.TIMER, -1, cancelledEvent);
    }

    // Clean up structures.
    delete this.intervals[timerId];
  } else {
    if (this.counter !== null) {
      var cancelledEvent = metadata.nextEventId;
      this.trace.cancel(this.currentEvent, cancelledEvent);

      // Done waiting for the timer.
      this.counter.change(EventCounter.Category.TIMER, -1, cancelledEvent);
    }
  }
};

EventMonitor.prototype.onEnterTimerCallback =
    function (timerId, kind, metadata) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assertEq(this.currentEvent, null);

  var predecessor = null;
  if (kind === TimerKind.INTERVAL) {
    debugging.assertEq(typeof timerId, 'number');

    var shadow = this.intervals[timerId];
    debugging.assert(shadow.nextIntervalEventId instanceof EventId);

    this.currentEvent = shadow.nextIntervalEventId;

    // Create a new event ID for the next interval event.
    shadow.nextIntervalEventId = new EventId();

    // Wait for the next event to fire.
    if (this.counter !== null) {
      this.counter.change(EventCounter.Category.TIMER, 1,
                          shadow.nextIntervalEventId);
    }

    predecessor = this.intervals[timerId].predecessor;
  } else {
    debugging.assert(metadata.nextEventId instanceof EventId);
    this.currentEvent = metadata.nextEventId;

    predecessor = metadata.predecessor;
  }

  debugging.assert(predecessor instanceof EventId);

  logger.logIf(
    window === window.parent,
    util.format('ENTER %s (timer: %s, event: %s, pred: %s)',
                kind.toUpperCase(), timerId, this.currentEvent.id(),
                predecessor.id()));

  if (kind === TimerKind.INTERVAL && this.trace !== null) {
    this.trace.join(this.currentEvent, predecessor, Trace.JoinKind.INTERVAL);
  }

  return metadata;
};

EventMonitor.prototype.onExitTimerCallback =
    function (timerId, kind, metadata) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  logger.logIf(
    window === window.parent,
    util.format('EXIT %s (event: %s)', kind.toUpperCase(),
                this.currentEvent.id()));

  if (this.trace !== null) {
    if (kind === TimerKind.INTERVAL) {
      // Done waiting for the interval.
      this.counter.change(EventCounter.Category.TIMER, -1, this.currentEvent);

      // The predecessor of the next interval event is the current event.
      if (this.intervals[timerId]) {
        var shadow = this.intervals[timerId];
        shadow.predecessor = this.currentEvent;
      } else {
        // Interval has been canceled by the current event handler.
      }
    } else {
      // Done waiting for the timer.
      this.counter.change(EventCounter.Category.TIMER, -1,
                          metadata.nextEventId);
    }
  }

  this.currentEvent = null;
};


// Promises


/**
 * This method is invoked when a new promise object is created
 * (i.e., when the web application invokes the Promise constructor).
 */
EventMonitor.prototype.onPromiseCreation = function (promiseId, shadow) {
  debugging.assertEq(typeof promiseId, 'number');
  debugging.assertEq(typeof shadow, 'object');

  debugging.assert(!this.assertApplicationIsInactive);

  logger.log(util.format('promise-create (promise id: %s)', promiseId));

  // Create a shadow object for this promise, which will be used to track the
  // state and the resolution and rejection event handlers of this promise.
  shadow.state = PromiseState.PENDING;
  shadow.thenEventHandlerEventIds = new List();
  shadow.catchEventHandlerEventIds = new List();

  if (this.trace !== null) {
    // Invariant: trace != null <=> this.counter != null.
    debugging.assertNe(this.counter, null);

    // Every time the EventMonitor is in the middle of creating a trace, it
    // also keeps track of the number of pending events. Now that this promise
    // has been created, we need to wait for it to become resolved or rejected.
    // This is signaled by incrementing the counter object.
    if (shadow.mustFinish) {
      this.counter.change(EventCounter.Category.PROMISE, 1);
    }
  }
};

/**
 * This method is invoked when a promise gets resolved.
 */
EventMonitor.prototype.onPromiseResolution = function (promiseId, shadow) {
  debugging.assertEq(typeof promiseId, 'number');
  debugging.assertEq(typeof shadow, 'object');

  logger.log(util.format('promise-resolve (promise id: %s)', promiseId));

  // The flag `assertApplicationIsInactive` is only used for debugging.
  // It is being set when no events are expected to execute, i.e.,
  // when the web application is expected to be idle.
  debugging.assert(!this.assertApplicationIsInactive);

  if (shadow.state !== PromiseState.PENDING) {
    // This is a no-op.
    return;
  }

  // Update the state of this promise, now that this promise has been resolved.
  shadow.state = PromiseState.FULFILLED;

  if (this.currentEvent !== null) {
    shadow.fulfilledByEventId = this.currentEvent;
  }

  // If the EventMonitor is currently in the middle of creating a trace,
  // then `this.trace` will be a Trace object.
  if (this.trace !== null) {
    // Invariant: trace != null <=> this.counter != null.
    debugging.assertNe(this.counter, null);

    // Every time the `then` method is called on a promise, the event id of
    // the then event handler is added to the `thenEventHandlerEventIds` of
    // the promise (see `EventMonitor.prototype.onRegisterEventListener`).
    //
    // If this promise has a then event handler, then create a "fork" event
    // for the first then event handler of this promise.
    if (!shadow.thenEventHandlerEventIds.isEmpty()) {
      var thenHandler = shadow.thenEventHandlerEventIds.first();
      debugging.assert(thenHandler.eventId instanceof EventId);

      // Add the "fork" operation to the trace (see `Trace.prototype.fork`).
      if (this.currentEvent !== null) {
        this.trace.fork(this.currentEvent, thenHandler.eventId,
                        Trace.ForkKind.PROMISE_RESOLVE);
      }
    }

    // Every time the EventMonitor is in the middle of creating a trace, it
    // also keeps track of the number of pending events. Now that this promise
    // has been resolved, we no longer have to wait for it.
    // This is signaled by decrementing the counter object.
    if (shadow.mustFinish) {
      this.counter.change(EventCounter.Category.PROMISE, -1);
    }
  }
};

/**
 * This method is invoked when a promise gets rejected.
 */
EventMonitor.prototype.onPromiseRejection = function (promiseId, shadow) {
  debugging.assertEq(typeof promiseId, 'number');
  debugging.assertEq(typeof shadow, 'object');

  logger.log(util.format('promise-reject (promise id: %s)', promiseId));

  // The flag `assertApplicationIsInactive` is only used for debugging.
  // It is being set when no events are expected to execute, i.e.,
  // when the web application is expected to be idle.
  debugging.assert(!this.assertApplicationIsInactive);

  // Update the state of this promise, now that this promise has been rejected.
  debugging.assertEq(shadow.state, PromiseState.PENDING);
  shadow.state = PromiseState.REJECTED;

  if (this.currentEvent !== null) {
    shadow.rejectedByEventId = this.currentEvent;
  }

  // If the EventMonitor is currently in the middle of creating a trace,
  // then `this.trace` will be a Trace object.
  if (this.trace !== null) {
    // Invariant: trace != null <=> this.counter != null.
    debugging.assertNe(this.counter, null);

    // Every time the `catch` method is called on a promise, the event id of
    // the catch event handler is added to the `catchEventHandlerEventIds` of
    // the promise (see `EventMonitor.prototype.onRegisterEventListener`).
    //
    // If this promise has a catch event handler, then create a "fork" event
    // for the first catch event handler of this promise.
    if (!shadow.catchEventHandlerEventIds.isEmpty()) {
      var catchHandler = shadow.catchEventHandlerEventIds.first();
      debugging.assert(catchHandler.eventId instanceof EventId);

      // Add the "fork" operation to the trace (see `Trace.prototype.fork`).
      this.trace.fork(this.currentEvent, catchHandler.eventId,
                      Trace.ForkKind.PROMISE_REJECT);
    }

    // Every time the EventMonitor is in the middle of creating a trace, it
    // also keeps track of the number of pending events. Now that this promise
    // has been rejected, we no longer have to wait for it.
    // This is signaled by decrementing the counter object.
    if (shadow.mustFinish) {
      this.counter.change(EventCounter.Category.PROMISE, -1);
    }
  }
};


// Resources


EventMonitor.prototype.onResourceRequest = function (url, shadow) {
  debugging.assertEq(typeof shadow, 'object');
  debugging.assert(!this.assertApplicationIsInactive);

  logger.info(util.format('RESOURCE-REQUEST (url: %s)', url));

  // Create a new event ID for the response.
  shadow.resourceResponseEventId = new EventId();

  if (this.trace !== null) {
    // Update the trace.
    var metadata = { url: url };
    if (shadow.shadowed instanceof natives.refs.HTMLImageElement.ref) {
      this.trace.fork(this.currentEvent, shadow.resourceResponseEventId,
                      Trace.ForkKind.LOAD_IMG, metadata);
    } else if (shadow.shadowed instanceof natives.refs.HTMLScriptElement.ref) {
      this.trace.fork(this.currentEvent, shadow.resourceResponseEventId,
                      Trace.ForkKind.LOAD_SCRIPT, metadata);
    } else {
      this.trace.fork(this.currentEvent, shadow.resourceResponseEventId,
                      Trace.ForkKind.LOAD_RESOURCE, metadata);
    }

    // Wait for the resource to load.
    this.counter.change(EventCounter.Category.from(shadow.shadowed), 1);
  }
};

EventMonitor.prototype.onResourceResponse = function (url, shadow, error) {
  debugging.assert(!this.assertApplicationIsInactive);

  logger.info(
    util.format('RESOURCE-RESPONSE (url: %s, failed: %s)', url, !!error));

  if (this.trace !== null) {
    // Done waiting for the resource to load.
    this.counter.change(EventCounter.Category.from(shadow.shadowed), -1);
  }
};


// Other


EventMonitor.prototype.onRegisterEventListener =
    function (target, type, listener, options) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  var isTargetPromise = type === 'then' || type === 'catch';
  var enterOptions = {
    isTargetPromise: isTargetPromise,
    predecessor: this.currentEvent,
    type: type
  };

  if (isTargetPromise) {
    debugging.assertEq(typeof options.shadowOfTarget, 'object');

    var shadow = options.shadowOfTarget;

    // Create an event ID for the future then event.
    var nextEventId = new EventId();
    enterOptions.nextEventId = nextEventId;

    switch (type) {
      case 'then':
        if (!shadow.thenEventHandlerEventIds.isEmpty()) {
          enterOptions.lastRegisteredThenHandler =
            shadow.thenEventHandlerEventIds.last();
        }
        shadow.thenEventHandlerEventIds.push({ eventId: nextEventId });

        // If the promise has already been resolved, then add a "fork" operation
        // to the trace.
        if (shadow.state === PromiseState.FULFILLED && this.trace !== null &&
            shadow.fulfilledByEventId instanceof EventId) {
          this.trace.fork(shadow.fulfilledByEventId, nextEventId,
                          Trace.ForkKind.PROMISE_RESOLVE);
        }
        break;

      case 'catch':
        if (!shadow.catchEventHandlerEventIds.isEmpty()) {
          enterOptions.lastRegisteredCatchHandler =
            shadow.catchEventHandlerEventIds.last();
        }
        shadow.catchEventHandlerEventIds.push({ eventId: nextEventId });

        // If the promise has already been rejected, then add a "fork" operation
        // to the trace.
        if (shadow.state === PromiseState.REJECTED && this.trace !== null &&
            shadow.rejectedByEventId instanceof EventId) {
          this.trace.fork(shadow.rejectedByEventId, nextEventId,
                          Trace.ForkKind.PROMISE_REJECT);
        }
        break;

      default:
        debugging.assert(false);
    }
  }

  return enterOptions;
};

EventMonitor.prototype.onEnterEventListener =
    function (receiver, event, metadata) {
  debugging.assert(!this.assertApplicationIsInactive);

  var predecessor = metadata.predecessor;
  var isResourceResponseHandler =
    (receiver instanceof natives.refs.HTMLImageElement.ref ||
     receiver instanceof natives.refs.HTMLScriptElement.ref) &&
    (event.type === 'load' || event.type === 'error');

  debugging.assert(predecessor instanceof EventId);

  var isAsync = this.currentEvent === null;
  var exitOptions = {
    receiver: receiver,
    type: metadata.type,
    isAsync: isAsync
  };

  if (isAsync) {
    if (metadata.isTargetPromise) {
      debugging.assert(metadata.nextEventId instanceof EventId);
      this.currentEvent = metadata.nextEventId;
    } else if (isResourceResponseHandler) {
      var shadow = receiver[symbols.SHADOW];

      if (!shadow) {
        logger.warn('Resource response without a response event ID');
        shadow = misc.createShadow(receiver, {
          resourceResponseEventId: new EventId()
        });
      }

      debugging.assertEq(typeof shadow, 'object');
      debugging.assert(shadow.resourceResponseEventId instanceof EventId);

      this.currentEvent = shadow.resourceResponseEventId;
    } else {
      this.currentEvent = metadata.nextEventId || new EventId();
    }

    logger.log(util.format('ENTER %s (pred: %s)', this.currentEvent.id(),
                           predecessor.id()), receiver, event);

    if (this.trace !== null) {
      if (metadata.isTargetPromise) {
        switch (metadata.type) {
          case 'then':
            this.trace.join(this.currentEvent, predecessor,
                            Trace.JoinKind.PROMISE_THEN);

            // The current event will only fire after the last of the registered
            // then handlers has been executed.
            if (metadata.lastRegisteredThenHandler) {
              this.trace.join(this.currentEvent,
                              metadata.lastRegisteredThenHandler.eventId,
                              Trace.JoinKind.PROMISE_THEN);
            }
            break;

          case 'catch':
            this.trace.join(this.currentEvent, predecessor,
                            Trace.JoinKind.PROMISE_CATCH);

            // The current event will only fire after the last of the registered
            // catch handlers has been executed.
            if (metadata.lastRegisteredCatchHandler) {
              this.trace.join(this.currentEvent,
                              metadata.lastRegisteredCatchHandler.eventId,
                              Trace.JoinKind.PROMISE_THEN);
            }
            break;

          default:
            debugging.assert(false);
        }
      }
    }
  }

  return exitOptions;
};

EventMonitor.prototype.onExitEventListener = function (metadata) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(
    this.currentEvent instanceof EventId,
    util.format('No event at event handler exit (type: %s)', metadata.type));

  if (metadata.isAsync) {
    logger.log(util.format('EXIT %s', this.currentEvent.id()),
               metadata.receiver, metadata.type);
    this.currentEvent = null;
  }
};

EventMonitor.prototype.onDOMMutation = function (container, newNode, area) {
  debugging.assert(!this.assertApplicationIsInactive);
  debugging.assert(this.currentEvent instanceof EventId);

  if (container !== null &&
      dom.isNodeAttachedToDocument(container) &&
      (newNode === null || dom.isVisible(newNode))) {
    logger.log(util.format('mutate-dom[x=%s,y=%s,w=%s,h=%s]',
                           area.x, area.y, area.width, area.height));

    if (this.trace !== null) {
      // Record that the current event handler has mutated the DOM.
      this.trace.mutateDOM(this.currentEvent, container, area);
    }
  }
};

/**
 * This function produces a trace for the given user event handler.
 *
 * Returns a promise that resolves to the generated trace.
 */
EventMonitor.prototype.createTrace =
    function (userEventListener, shouldBlockAjaxResponseEvents) {
  var monitor = this;

  if (shouldBlockAjaxResponseEvents) {
    this.shouldBlockAjaxResponseEvents = true;
  }

  var promise = new Future((resolve, reject) => {
    // Put all log messages related to the generation of the trace for
    // `userEventListener` in the same group.
    console.group(util.format('Analyzing %s @ %s', userEventListener.type,
      dom.getUniqueCssPath(userEventListener.target)));

    // Get ID for user event listener prior to executing the event handler,
    // since the event handler might mutate the DOM (and thereby the ID of
    // the user event handler).
    var userEventListenerId = userEventListener.getID();

    // Create a new trace for this user event handler.
    monitor.trace = new Trace();

    // Create an event counter to keep track of when the trace has been fully
    // generated.
    monitor.counter = new EventCounter();
    monitor.counter.then(function () {
      console.groupEnd();

      // Resolve promise.
      resolve({
        userEventListener: userEventListenerId,
        trace: monitor.trace
      });

      // Reset state.
      monitor.counter = null;
      monitor.trace = null;

      if (shouldBlockAjaxResponseEvents) {
        monitor.shouldBlockAjaxResponseEvents = false;
      }
    });

    // Counter should wait for the user event handler to finish.
    monitor.counter.change(EventCounter.Category.RESOURCE_SCRIPT, 1);

    natives.refs.setTimeout.call(window, function () {
      try {
        debugging.assert(
          monitor.currentEvent === null,
          "Illegal state: currentEvent must be null prior to starting the " +
          "analysis of a user event handler.");

        monitor.currentEvent = new EventId();

        monitor.trace.root(monitor.currentEvent);

        // Invoke the user event handler directly.
        var eventObject =
          dom.getEvent(userEventListener.target, userEventListener.type,
                       userEventListener.event);
        if (userEventListener.target instanceof natives.refs.HTMLElement.ref) {
          userEventListener.target.dispatchEvent(eventObject);
        } else {
          userEventListener.options.wrapper.call(
            userEventListener.target, eventObject);
        }
      } finally {
        monitor.counter.change(EventCounter.Category.RESOURCE_SCRIPT, -1);
        monitor.currentEvent = null;
      }
    }, 0);
  });

  if (phase.get() === phase.DEBUGGING) {
    promise = promise.then((traces) => {
      return new Future((resolve, reject) => {
        // Check that no event handlers execute in 2 seconds. If any event
        // handler executes after this trace has been created, then the
        // EventMonitor must be finishing too early.
        monitor.assertApplicationIsInactive = true;
        natives.refs.setTimeout.call(window, () => {
          monitor.assertApplicationIsInactive = false;
          resolve(traces);
        }, 2000);

      });
    });
  }

  return promise;
};

/**
 * Dispatched all the events in `blockedAjaxResponseEvents`.
 *
 * Returns a promise that gets resolved when all events have been dispatched,
 * including all events generated by the event handlers for these events.
 */
EventMonitor.prototype.dispatchBlockedAjaxResponseEvents = function () {
  var monitor = this;

  return new Future((resolve, reject) => {
    var blockedLoadEvents = monitor.blockedAjaxResponseEvents.filter(
      (x) => (x.isAjaxEvent && x.isLoadEvent) || x.isScript);

    // Put all log messages from the execution of these event handlers in
    // the same group.
    console.group(util.format('Dispatching %s blocked event(s)',
                              monitor.blockedAjaxResponseEvents.length));

    // Create a new trace for this user event handler.
    monitor.trace = new Trace();

    // Create an event counter to keep track of when the trace has been fully
    // generated.
    monitor.counter = new EventCounter();
    monitor.counter.then(function () {
      console.groupEnd();

      // Resolve promise.
      resolve(blockedLoadEvents.length);

      // Reset state.
      monitor.counter = null;
      monitor.trace = null;
    });

    // Counter should wait for the Ajax response event handlers to finish.
    blockedLoadEvents.forEach((blockedLoadEvent) => {
      if (blockedLoadEvent.isAjaxEvent) {
        monitor.counter.change(EventCounter.Category.AJAX, 1);
      } else if (blockedLoadEvent.isScript) {
        monitor.counter.change(EventCounter.Category.RESOURCE_SCRIPT, 1);
      } else {
        debugging.assertUnreachable();
      }
    });

    // Counter should wait for all the events to be dispatched.
    monitor.counter.change(EventCounter.Category.RESOURCE_SCRIPT, 1);

    // Call all the event handlers.
    natives.refs.setTimeout.call(window, function () {
      monitor.blockedAjaxResponseEvents.forEach((x) => {
        debugging.assertEq(
          monitor.currentEvent, null,
          "Illegal state: currentEvent must be null prior to dispatching " +
          "an event.");
        try {
          x.dispatcher();
        } catch (e) {
        } finally {
        }
      });

      // Empty the list of blocked Ajax response events, since they have all
      // been dispatched now.
      while (monitor.blockedAjaxResponseEvents.length > 0) {
        monitor.blockedAjaxResponseEvents.pop();
      }

      monitor.counter.change(EventCounter.Category.RESOURCE_SCRIPT, -1);
    }, 0);
  });
};

module.exports = new EventMonitor();
