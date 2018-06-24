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
