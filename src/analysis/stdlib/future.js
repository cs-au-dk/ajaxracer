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
