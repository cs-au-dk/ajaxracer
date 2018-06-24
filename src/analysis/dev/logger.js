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

var natives = require('../utils/natives.js');

function error() {
  natives.refs.console.error.apply(natives.refs.console.ref, arguments);
}

function info() {
  natives.refs.console.info.apply(natives.refs.console.ref, arguments);
}

function infoIf(x, message) {
  if (x) {
    info(message);
  }
}

function log() {
  natives.refs.console.log.apply(natives.refs.console.ref, arguments);
}

function logIf(x, message) {
  if (x) {
    log(message);
  }
}

function warn() {
  natives.refs.console.warn.apply(natives.refs.console.ref, arguments);
}

function warnIf(x, message) {
  if (x) {
    warn(message);
  }
}

module.exports = {
  error: error,
  info: info,
  infoIf: infoIf,
  log: log,
  logIf: logIf,
  warn: warn,
  warnIf: warnIf
};
