// Internal
var { ForkKind, JoinKind, Operation } = require('../../common/trace.js');
var debugging = require('../../common/debugging.js');
var dom = require('../utils/dom.js');
var EventId = require('./event-id.js');
var extend = require('extend');
var List = require('../stdlib/list.js');
var logger = require('../dev/logger.js');
var natives = require('../utils/natives.js');
var TimerKind = require('./timer-kind.js');

// External
var util = require('util');

ForkKind.fromTimerKind = function (kind) {
  switch (kind) {
    case TimerKind.ANIMATION_FRAME_REQUEST:
      return ForkKind.ANIMATION_FRAME_REQUEST;

    case TimerKind.IDLE_CALLBACK_REQUEST:
      return ForkKind.IDLE_CALLBACK_REQUEST;

    case TimerKind.IMMEDIATE_TIMER:
      return ForkKind.IMMEDIATE_TIMER;

    case TimerKind.INTERVAL:
      return ForkKind.INTERVAL;

    case TimerKind.TIMER:
      return ForkKind.TIMER;

    default:
      debugging.assertUnreachable();
  }
}

JoinKind.forXHR = function (xhr, event) {
  switch (event.type) {
    case 'error':
      return JoinKind.AJAX_ERROR;

    case 'load':
      return JoinKind.AJAX_LOADED;

    case 'progress':
      return JoinKind.AJAX_PROGRESS;

    case 'readystatechange':
      switch (xhr.readyState) {
        case natives.refs.XMLHttpRequest.HEADERS_RECEIVED:
          return JoinKind.AJAX_HEADERS_RECEIVED;
        case natives.refs.XMLHttpRequest.LOADING:
          return JoinKind.AJAX_LOADING;
        case natives.refs.XMLHttpRequest.DONE:
          return JoinKind.AJAX_DONE;
      }
      break;
  }

  debugging.assertUnreachable();
};

function Trace() {
  this.operations = new List();
}

Trace.ForkKind = ForkKind;
Trace.JoinKind = JoinKind;

Trace.prototype.cancel = function (u, v) {
  logger.log(util.format("CANCEL %s %s", u.numericId(), v.numericId()));
  this.operations.push({
    operation: Operation.CANCEL,
    u: u.numericId(),
    v: v.numericId()
  });
};

Trace.prototype.fork = function (u, v, kind, metadata) {
  debugging.assert(
    kind == ForkKind.AJAX_REQUEST || kind == ForkKind.ANIMATION_FRAME_REQUEST ||
      kind == ForkKind.IDLE_CALLBACK_REQUEST ||
      kind == ForkKind.IMMEDIATE_TIMER || kind == ForkKind.INTERVAL ||
      kind == ForkKind.LOAD_IMG || kind == ForkKind.LOAD_RESOURCE ||
      kind == ForkKind.LOAD_SCRIPT || kind == ForkKind.PROMISE_REJECT ||
      kind == ForkKind.PROMISE_RESOLVE || kind == ForkKind.TIMER,
    'Parameter "kind" must be a ForkKind.');

  logger.log(util.format("FORK(%s) %s %s", kind, u.numericId(), v.numericId()));

  var operation = {
    operation: Operation.FORK,
    kind: kind,
    u: u.numericId(),
    v: v.numericId()
  };

  if (metadata) {
    operation = extend(operation, metadata);
  }

  this.operations.push(operation);
};

Trace.prototype.join = function (u, v, kind) {
  debugging.assert(
    kind == JoinKind.AJAX_ERROR || kind == JoinKind.AJAX_DONE ||
    kind == JoinKind.AJAX_HEADERS_RECEIVED || kind == JoinKind.AJAX_LOADED ||
    kind == JoinKind.AJAX_LOADING || kind == JoinKind.AJAX_PROGRESS ||
    kind == JoinKind.INTERVAL || kind == JoinKind.PROMISE_CATCH ||
    kind == JoinKind.PROMISE_THEN,
    'Parameter "kind" must be a JoinKind.');

  logger.log(util.format("JOIN(%s) %s %s", kind, u.numericId(), v.numericId()));
  this.operations.push({
    operation: Operation.JOIN,
    kind: kind,
    u: u.numericId(),
    v: v.numericId()
  });
};

Trace.prototype.mutateDOM = function (u, element, area) {
  if (area.height > 0 && area.width > 0) {
    this.operations.push({
      operation: Operation.MUTATE_DOM,
      element: dom.getUniqueCssPath(element),
      area: area,
      u: u.numericId()
    });
  }
};

Trace.prototype.normalize = function () {
  var eventIds = new natives.refs.Set.ref();

  // Populate the set `eventIds`.
  this.operations.forEach((operation) => {
    if (typeof operation.u === 'number') {
      natives.refs.Set.add.call(eventIds, operation.u);
    }
    if (typeof operation.v === 'number') {
      natives.refs.Set.add.call(eventIds, operation.v);
    }
  });

  // Sort the event IDs.
  var sortedEventIds = new List(eventIds);
  sortedEventIds.sort((x, y) => x - y);

  // Map event IDs to new eventIDs, starting from 0.
  var newEventIds = new natives.refs.Map.ref();
  sortedEventIds.forEach((eventId, newEventId) =>
    natives.refs.Map.set.call(newEventIds, eventId, newEventId));

  // Update all the event IDs in the trace.
  this.operations.forEach((operation) => {
    if (typeof operation.u === 'number') {
      debugging.assertEq(typeof (operation.u =
        natives.refs.Map.get.call(newEventIds, operation.u)), 'number');
    }
    if (typeof operation.v === 'number') {
      debugging.assertEq(typeof (operation.v =
        natives.refs.Map.get.call(newEventIds, operation.v)), 'number');
    }
  });
};

Trace.prototype.root = function (u) {
  debugging.assert(u instanceof EventId);

  this.operations.push({
    operation: Operation.ROOT,
    u: u.numericId()
  });
};

Trace.prototype.toJSON = function () {
  this.normalize();
  return this.operations.toJSON();
};

module.exports = Trace;
