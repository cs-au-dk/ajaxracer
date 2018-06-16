// Internal
var debugging = require('../../common/debugging.js');
var logger = require('../dev/logger.js');
var natives = require('../utils/natives.js');

// External
var util = require('util');

var EventCategory = {
  AJAX: 'ajax',
  LOAD: 'load',
  PROMISE: 'promise',
  RESOURCE_IMG: 'resource-img',
  RESOURCE_SCRIPT: 'resource-script',
  TIMER: 'timer'
};

EventCategory.from = function (target) {
  if (target instanceof natives.refs.HTMLImageElement.ref) {
    return EventCategory.RESOURCE_IMG;
  }
  if (target instanceof natives.refs.HTMLScriptElement.ref) {
    return EventCategory.RESOURCE_SCRIPT;
  }
  return null;
};

function EventCounter() {
  this.callback = null;
  this.hasCompleted = false;
  this.numberOfPendingEvents = 0;
  this.pendingEvents = {
    [EventCategory.AJAX]: new Set(),
    [EventCategory.LOAD]: new Set(),
    [EventCategory.PROMISE]: new Set(),
    [EventCategory.RESOURCE_IMG]: new Set(),
    [EventCategory.RESOURCE_SCRIPT]: new Set(),
    [EventCategory.TIMER]: new Set()
  };
  this.pendingResources = new Map();

  // Periodically print status until loading has finished.
  this.intervalId = natives.refs.setInterval.call(window, function () {
    this.print();
  }.bind(this), 5000);
}

// Export `EventCategory` via `EventCounter`.
EventCounter.Category = EventCategory;

EventCounter.prototype.print = function () {
  logger.infoIf(
    window === window.parent,
    util.format(
      'Still waiting for %s events (pending ajax: %s, pending images: %s, ' +
        'pending load: %s, pending promises: %s, pending scripts: %s, ' +
        'pending timers: %s)',
      this.numberOfPendingEvents,
      this.pendingEvents[EventCategory.AJAX].size,
      this.pendingEvents[EventCategory.RESOURCE_IMG].size,
      this.pendingEvents[EventCategory.LOAD].size,
      this.pendingEvents[EventCategory.PROMISE].size,
      this.pendingEvents[EventCategory.RESOURCE_SCRIPT].size,
      this.pendingEvents[EventCategory.TIMER].size));
  logger.infoIf(
    window === window.parent,
    util.format('Pending resources: %s', this.pendingResources.entries()));
};

EventCounter.prototype.change = function (
    category, diff, id, metadata) {
  debugging.assert(typeof category, 'string');
  debugging.assert(diff === 1 || diff === -1);

  this.numberOfPendingEvents += diff;

  var pendingEvents = this.pendingEvents[category];
  if (diff === 1) {
    if (id === null || id === undefined) {
      id = findFreshEventId(pendingEvents);
    }

    debugging.assert(!pendingEvents.has(id));
    pendingEvents.add(id);
  } else {
    debugging.assertNe(pendingEvents.size, 0);

    if (id === null || id === undefined) {
      id = pendingEvents.values().next().value;
    }

    debugging.assert(pendingEvents.has(id));
    pendingEvents.delete(id);
  }

  if (metadata && metadata.resourceUrl) {
    if (diff === 1) {
      if (this.pendingResources.has(metadata.resourceUrl)) {
        logger.warn('Resource already pending: ' + metadata.resourceUrl);
        this.pendingResources.set(
          metadata.resourceUrl,
          this.pendingResources.get(metadata.resourceUrl) + 1);
      } else {
        this.pendingResources.set(metadata.resourceUrl, 1);
      }
    } else {
      debugging.assert(this.pendingResources.has(metadata.resourceUrl));
      if (this.pendingResources.get(metadata.resourceUrl) > 1) {
        this.pendingResources.set(
          metadata.resourceUrl,
          this.pendingResources.get(metadata.resourceUrl) - 1);
      } else {
        this.pendingResources.delete(metadata.resourceUrl);
      }
    }
  }

  if (this.numberOfPendingEvents === 0) {
    this.checkCompletion();
  }
};

EventCounter.prototype.checkCompletion = function () {
  // Asynchronously check that if this counter has reached 0. This is needed
  // when the execution of an event handler causes the event counter to reach 0,
  // but another event handler for the same event creates a new event.
  natives.refs.setTimeout.call(window, function () {
    if (this.numberOfPendingEvents > 0 || this.hasCompleted) {
      return;
    }

    debugging.assert(typeof this.callback === 'function');

    this.hasCompleted = true;

    // Use `call` such that the receiver does not become this EventCounter
    // instance by mistake.
    this.callback.call(window);

    // Stop timer that periodically prints the status.
    natives.refs.clearInterval.call(window, this.intervalId);
  }.bind(this), 0);
};

EventCounter.prototype.then = function (callback) {
  this.callback = callback;
};

function findFreshEventId(pendingEvents) {
  var candidate = 1;
  while (pendingEvents.has(candidate)) {
    ++candidate;
  }
  return candidate;
}

module.exports = EventCounter;
