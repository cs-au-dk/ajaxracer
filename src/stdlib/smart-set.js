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
var debugging = require('../common/debugging.js');

function SmartSet(x) {
  this._set = new Set(x);

  Object.defineProperty(this, 'length', {
    get: function () {
      return this._set.size;
    }
  });

  Object.defineProperty(this, 'size', {
    get: function () {
      return this._set.size;
    }
  });
}

// Forward method calls to the underlying Set.
['add', 'clear', 'delete', 'entries', 'forEach', 'has', 'keys', 'values']
  .forEach((methodName) => {
    SmartSet.prototype[methodName] = function () {
      return this._set[methodName].apply(this._set, arguments);
    };
  });

SmartSet.prototype.every = function (predicate) {
  return Array.from(this._set).every(predicate);
};

SmartSet.prototype.find = function (predicate) {
  return Array.from(this._set).find(predicate);
};

SmartSet.prototype.first = function () {
  debugging.assert(this._set.size > 0);
  return this._set.values().next().value;
};

SmartSet.prototype.isEmpty = function () {
  return this._set.size === 0;
};

SmartSet.prototype.toArray = function () {
  return Array.from(this._set);
};

module.exports = SmartSet;
