var util = require('util');

var errorHandler = null;

function getStackTrace() {
  var obj = {};
  Error.captureStackTrace(obj, getStackTrace);
  return obj.stack;
}

function getMessage(msg) {
  if (typeof msg === 'string') {
    return msg;
  }
  if (typeof msg === 'function') {
    return msg();
  }
  return null;
}

function assert(x, msg) {
  if (!x) {
    msg = getMessage(msg);
    if (typeof msg === 'string') {
      msg = util.format('Assertion failed: %s\n%s', msg, getStackTrace());
    } else {
      msg = util.format('Assertion failed\n%s', getStackTrace());
    }
    var error = new Error(msg);
    if (typeof errorHandler === 'function') {
      errorHandler(error);
    }
    throw error;
  }
}

function assertEq(x, y, msg) {
  msg = getMessage();
  if (typeof msg === 'string') {
    assert(x === y,
           util.format('%s (expected %s to equal %s)', getMessage(msg), x, y));
  } else {
    assert(x === y, util.format('expected %s to equal %s', x, y));
  }
}

function assertFalse(x, msg) {
  assert(!x, msg);
}

function assertNe(x, y, msg) {
  msg = getMessage();
  if (typeof msg === 'string') {
    assert(x !== y,
           util.format('%s (expected %s not to equal %s)', getMessage(msg), x, y));
  } else {
    assert(x !== y, util.format('expected %s not to equal %s', x, y));
  }
}

function assertStructurallyEq(x, y, msg) {
  assertEq(typeof x, 'object');
  assertEq(typeof y, 'object');

  function isStructurallyEq(x, y) {
    if (typeof x === 'object' && x !== null &&
        typeof y === 'object' && y !== null) {
      var properties = [];
      if (x instanceof Array) {
        Array.prototype.push.apply(properties, x.map((_, i) => i));
      } else {
        Array.prototype.push.apply(properties, Object.getOwnPropertyNames(x));
      }
      if (y instanceof Array) {
        Array.prototype.push.apply(properties, y.map((_, i) => i));
      } else {
        Array.prototype.push.apply(properties, Object.getOwnPropertyNames(y));
      }
      return properties.every((p) => isStructurallyEq(x[p], y[p]));
    }
    return x === y;
  }

  msg = getMessage();
  if (typeof msg === 'string') {
    assert(isStructurallyEq(x, y),
           util.format('%s (expected %s to equal %s)',
                       getMessage(msg), JSON.stringify(x), JSON.stringify(y)));
  } else {
    assert(isStructurallyEq(x, y),
           util.format('expected %s to equal %s',
                       JSON.stringify(x), JSON.stringify(y)));
  }
}

function assertUnreachable() {
  assert(false);
}

function registerErrorHandler(newErrorHandler) {
  if (errorHandler === null) {
    errorHandler = newErrorHandler;
  } else {
    var oldErrorHandler = errorHandler;
    errorHandler = function () {
      oldErrorHandler();
      newErrorHandler();
    };
  }
}

module.exports = {
  assert: assert,
  assertEq: assertEq,
  assertFalse: assertFalse,
  assertNe: assertNe,
  assertStructurallyEq: assertStructurallyEq,
  assertUnreachable: assertUnreachable,
  registerErrorHandler: registerErrorHandler
};
