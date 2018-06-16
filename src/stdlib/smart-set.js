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
