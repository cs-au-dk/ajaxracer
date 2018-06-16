// Internal
var debugging = require('../../common/debugging.js');
var natives = require('../utils/natives.js');

var Promise = natives.refs.Promise;

function Future(x) {
  debugging.assert(this instanceof Future);

  if (typeof x === 'function') {
    this.promise = new Promise.ref(x);
  } else {
    debugging.assert(x instanceof Promise.ref);
    this.promise = x;
  }
}

Future.prototype.then = function () {
  return new Future(Promise.then.apply(this.promise, arguments));
};

Future.prototype.catch = function () {
  return new Future(Promise.catch.apply(this.promise, arguments));
};

Future.resolve = function () {
  return new Future(Promise.resolve.apply(Promise.ref, arguments));
};

Future.reject = function () {
  return new Future(Promise.reject.apply(Promise.ref, arguments));
};

module.exports = Future;
