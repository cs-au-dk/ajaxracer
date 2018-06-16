// Internal
var debugging = require('../../common/debugging.js');
var natives = require('./natives.js');

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 * Returns an array of the parameters names of the function `f`.
 */
function getParameterNames(f) {
  var fnStr = getSourceCode(f).replace(STRIP_COMMENTS, '');
  var parameterNames = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
                            .match(ARGUMENT_NAMES);
  if (parameterNames === null) {
    return [];
  }
  return parameterNames;
}

function getSourceCode(f) {
  if (typeof f === 'function') {
    return natives.refs.Function.toString.call(f);
  }
  if (typeof f === 'string') {
    return f;
  }
  debugging.assertUnreachable();
}

function isNativeFunction(f) {
  var code = getSourceCode(f);
  return code.indexOf('[native code]') >= 0;
}

module.exports = {
  getParameterNames: getParameterNames,
  getSourceCode: getSourceCode,
  isNativeFunction: isNativeFunction
};
