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
