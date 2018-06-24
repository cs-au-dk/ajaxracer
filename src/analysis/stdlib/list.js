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

function List(x, isArguments) {
  if (!(x instanceof natives.refs.Array.ref)) {
    if (typeof x === 'number') {
      // Create an array with the given size.
      x = natives.refs.Array.ref.apply(null, { length: x });
    } else if (x instanceof natives.refs.HTMLCollection.ref) {
      // Convert from HTMLCollection to Array.
      x = natives.refs.Array.from.call(natives.refs.Array.ref, x);
    } else if (x instanceof natives.refs.NodeList.ref) {
      // Convert from NodeList to Array.
      x = natives.refs.Array.from.call(natives.refs.Array.ref, x);
    } else if (x instanceof natives.refs.Set.ref) {
      // Convert from Set to Array.
      x = natives.refs.Array.from.call(natives.refs.Array.ref, x);
    } else if (isArguments) {
      var y = [];
      for (var i = 0; i < x.length; ++i) {
        y.push(x[i]);
      }
      x = y;
    } else {
      // Create an empty array.
      x = [];
    }
  }
  this._arr = x;

  natives.refs.Object.defineProperty.call(
    natives.refs.Object.ref, this, 'length', {
      get: function () {
        return this._arr.length;
      }
    });
}

List.prototype.first = function () {
  debugging.assert(this._arr.length > 0, 'Cannot access first from empty List');
  return this._arr[0];
};

List.prototype.get = function (i) {
  return this._arr[i];
};

List.prototype.getArray = function () {
  return this._arr;
};

List.prototype.isEmpty = function () {
  return this._arr.length === 0;
};

List.prototype.last = function () {
  debugging.assert(this._arr.length > 0, 'Cannot access last from empty List');
  return this._arr[this._arr.length - 1];
};

List.prototype.set = function (i, v) {
  return this._arr[i] = v;
};

// These methods return a new array. The resulting array is wrapped in a List.
['concat', 'filter', 'map', 'slice', 'splice'].forEach(function (methodName) {
  List.prototype[methodName] = function () {
    return new List(natives.refs.Array[methodName].apply(this._arr, arguments));
  };
});

['reverse', 'sort'].forEach(function (methodName) {
  List.prototype[methodName] = function () {
    natives.refs.Array[methodName].apply(this._arr, arguments);
    return this;
  };
});

['every', 'find', 'findIndex', 'indexOf', 'forEach', 'join', 'pop', 'push',
 'shift', 'some', 'toString', 'unshift'].forEach(function (methodName) {
  List.prototype[methodName] = function () {
    return natives.refs.Array[methodName].apply(this._arr, arguments);
  };
});

List.prototype.toJSON = function () {
  return this._arr;
};

/**
 * Creates a clone of `x`: mutations will not be performed to the input array.
 */
List.clone = function (x) {
  if (x instanceof List) {
    x = x.getArray();
  }
  debugging.assert(x instanceof natives.refs.Array.ref);
  return new List(natives.refs.Array.from.call(natives.refs.Array.ref, x));
};

List.fromJson = function (o) {
  if (o instanceof natives.refs.Array.ref) {
    return List.mirror(o);
  }
  if (o._arr instanceof natives.refs.Array.ref) {
    return List.mirror(o._arr);
  }
  return new List();
};

/**
 * Creates a mirror of [arr]: mutations will also be performed to the input array.
 */
List.mirror = function (arr) {
  return new List(arr);
};

module.exports = List;
