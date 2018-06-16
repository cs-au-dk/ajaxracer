// Internal
var debugging = require('../../common/debugging.js');
var natives = require('../utils/natives.js');

function SmartSet() {
  this._set = new natives.refs.Set.ref();

  natives.refs.Object.defineProperty.call(
    natives.refs.Object.ref, this, 'length', {
      get: function () {
        return this._set.size;
      }
    });

  natives.refs.Object.defineProperty.call(
    natives.refs.Object.ref, this, 'size', {
      get: function () {
        return this._set.size;
      }
    });
}

SmartSet.prototype.add = function (x) {
  natives.refs.Set.add.call(this._set, x);
  return this;
};

SmartSet.prototype.filter = function (f) {
  var result = new SmartSet();
  this.forEach((x) => f(x) && result.add(x));
  return result;
};

SmartSet.prototype.forEach = function (f) {
  natives.refs.Set.forEach.call(this._set, f);
  return this;
};

SmartSet.prototype.has = function (x) {
  return natives.refs.Set.has.call(this._set, x);
};

SmartSet.prototype.isEmpty = function () {
  return this._set.size === 0;
};

module.exports = SmartSet;
