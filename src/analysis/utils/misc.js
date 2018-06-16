// Internal
var debugging = require('../../common/debugging.js');
var List = require('../stdlib/list.js');
var natives = require('./natives.js');
var symbols = require('./symbols.js');

/**
 * Removes the symbols that have been attached to the arguments by the
 * instrumentation, and then calls the function `f`.
 */
function callFunctionWithPlainObjects(f, base, args) {
  // Extract the native objects from args.
  var nonNativeArguments =
    new List(natives.refs.Array.from.call(natives.refs.Array.ref, args))
      .filter(isObject)
      .filter(isNotNative);

  // Gets rid of the property symbols.NATIVE.
  nonNativeArguments.forEach(clearIsNative);

  // Call `f` with the sanitized arguments.
  var result = f.apply(base, args);

  // Revert the changes to `nonNativeArguments`.
  nonNativeArguments.forEach(markNotNative);

  return result;
}

function clearIsNative(obj) {
  debugging.assert(isObject(obj));
  delete obj[symbols.NOT_NATIVE];
}

function createShadow(obj, shadow) {
  debugging.assert(!(symbols.SHADOW in obj));
  obj[symbols.SHADOW] = shadow;
  return shadow;
}

function getOrMakeShadow(obj) {
  if (symbols.SHADOW in obj) {
    return obj[symbols.SHADOW];
  }
  return obj[symbols.SHADOW] = {};
}

function getShadow(obj) {
  if (symbols.SHADOW in obj) {
    return obj[symbols.SHADOW];
  }
  return null;
}

function isNative(obj) {
  debugging.assert(isObject(obj));
  return obj[symbols.NOT_NATIVE] !== true;
}

function isNotNative(obj) {
  debugging.assert(isObject(obj));
  return obj[symbols.NOT_NATIVE] === true;
}

function isObject(value) {
  return typeof value === 'function' ||
         (typeof value === 'object' && value !== null);
}

function isWrapper(f) {
  debugging.assertEq(typeof f, 'function');
  return f[symbols.IS_WRAPPER] === true;
}

function makeWrapper(wrapper) {
  debugging.assertEq(typeof wrapper, 'function');
  wrapper[symbols.IS_WRAPPER] = true;
  return wrapper;
}

function makeWrapperFor(wrapped, wrapper) {
  if (wrapped === null) {
    return makeWrapper(wrapper);
  }
  debugging.assertEq(typeof wrapped, 'function');
  debugging.assertEq(typeof wrapper, 'function');
  wrapper[symbols.IS_WRAPPER] = true;
  wrapper[symbols.IS_WRAPPER_FOR] = wrapped;
  return wrapper;
}

function markNotNative(obj) {
  debugging.assert(isObject(obj));
  obj[symbols.NOT_NATIVE] = true;
}

function setShadow(obj, shadow) {
  debugging.assert(isObject(obj));
  debugging.assert(isObject(shadow));
  obj[symbols.SHADOW] = shadow;
}

function toAbsoluteUrl(path) {
  if (path === undefined) {
    path = 'undefined';
  }

  debugging.assertEq(typeof path, 'string');
  debugging.assert(path.length > 0);

  if (path.indexOf('//') === 0) {
    path = document.location.protocol + path;
  }

  if (path.indexOf('http://') === 0 || path.indexOf('https://') === 0) {
    // Already absolute.
    return path;
  }

  if (path[0] === '/') {
    return document.location.origin + path;
  }

  var i = document.location.href.lastIndexOf('/');
  if (i >= 0) {
    var prefix = document.location.href.substring(0, i + 1);
    return prefix + path;
  }

  debugging.assert(false);
}

function unwrap(f) {
  debugging.assert(isWrapper(f));
  if (typeof f[symbols.IS_WRAPPER_FOR] === 'function') {
    return f[symbols.IS_WRAPPER_FOR];
  }
  return f;
}

module.exports = {
  callFunctionWithPlainObjects: callFunctionWithPlainObjects,
  clearIsNative: clearIsNative,
  createShadow: createShadow,
  getOrMakeShadow: getOrMakeShadow,
  getShadow: getShadow,
  isNative: isNative,
  isNotNative: isNotNative,
  isObject: isObject,
  isWrapper: isWrapper,
  makeWrapper: makeWrapper,
  makeWrapperFor: makeWrapperFor,
  markNotNative: markNotNative,
  setShadow: setShadow,
  toAbsoluteUrl: toAbsoluteUrl,
  unwrap: unwrap
};
