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
var EventId = require('../data-types/event-id.js');
var eventMonitor = require('../monitors/event-monitor.js');
var List = require('../stdlib/list.js');
var logger = require('../dev/logger.js');
var misc = require('../utils/misc.js');
var natives = require('../utils/natives.js');
var symbols = require('../utils/symbols.js');

// External
var util = require('util');

function install(analysis) {
  window.XMLHttpRequest.prototype.abort = function () {
    var xhr = this;
    var shadow = misc.getOrMakeShadow(this);

    if (shadow.isActive || !shadow.isResponseDispatched) {
      analysis.notify('onAjaxAbort', [xhr, shadow, /*explicit=*/true]);

      if (shadow.isActive) {
        natives.refs.XMLHttpRequest.abort.call(this, arguments);
      } else if (!shadow.isResponseDispatched) {
        // The response has already been arrived, but it has been blocked in
        // adverse mode. Calling xhr.abort() will not do anything. Therefore
        // dispatching the event manually.
        var e = new ProgressEvent('abort', {
          bubbles: false, cancelable: false, composed: false
        });
        xhr.dispatchEvent(e);
      } else {
        debugging.assertUnreachable();
      }
    }

    shadow.isActive = false;
  };

  window.XMLHttpRequest.prototype.open = function (method, url, isAsync) {
    var shadow = misc.getOrMakeShadow(this);

    // This aborts the current request.
    debugging.assert(!shadow.isActive, 'Not implemented (active XHR)');

    if (shadow.isActive ||
        (shadow.hasPreviouslyBeenSent && !shadow.isResponseDispatched)) {
      analysis.notify('onAjaxAbort', [xhr, shadow, /*explicit=*/false]);
    }

    shadow.isAsync = arguments.length < 3 || isAsync;
    shadow.isCached = false;
    shadow.isResponseDispatched = false;
    shadow.method = method;
    shadow.isActive = false;
    // Such that the XHR object is opened in the readystatechange handler,
    // if there is one.
    shadow.isOpened = true;
    shadow.url = url;

    var result;
    try {
      result =
        natives.refs.XMLHttpRequest.open.call(this, method, url, shadow.isAsync);
    } catch (e) {
      shadow.isOpened = false; // Not set if the call to `open` fails.
    }
    return result;
  };

  window.XMLHttpRequest.prototype.send = function (data) {
    var xhr = this;

    var shadow = misc.getOrMakeShadow(xhr);
    debugging.assertEq(typeof shadow, 'object', 'XHR without a shadow object');
    debugging.assert(shadow.isOpened);

    natives.refs.XMLHttpRequest.send.call(xhr, data);

    if (xhr.readyState === 4) {
      shadow.isCached = true;
    }

    // Only emitted if the call to `send` succeeds. May, for example, fail with
    // "No 'Access-Control-Allow-Origin' header is present on the requested
    // resource.".
    analysis.notify('onAjaxRequest', [xhr, shadow]);

    shadow.hasPreviouslyBeenSent = true;
    shadow.isActive = true;

    // Register default event handlers.
    if (typeof xhr.onload !== 'function') {
      var f = function () {};
      xhr.onload = analysis.putFieldPre(/*iid=*/null, xhr, 'onload', f).val;
    }

    if (typeof xhr.onreadystatechange !== 'function') {
      var g = function () {};
      xhr.onreadystatechange =
        analysis.putFieldPre(/*iid=*/null, xhr, 'onreadystatechange', g).val;
    }

    if (typeof xhr.onerror !== 'function') {
      var h = function () {};
      xhr.onerror = analysis.putFieldPre(/*iid=*/null, xhr, 'onerror', h).val;
    }
  };
}

function makePutFieldPreObserver(analysis) {
  return (iid, base, offset, val) => {
    if (!(base instanceof natives.refs.XMLHttpRequest.ref)) {
      // Not assigning an event handler of an XMLHttpRequest object.
      return;
    }

    if (typeof val === 'function' && misc.isWrapper(val)) {
      val = misc.unwrap(val);
    }

    if (offset === 'timeout') {
      logger.warn(
        'Ignoring assignment to property timeout of an XMLHttpRequest object');
      return { skip: true };
    }

    if (offset === 'onloadend') {
      logger.warn(
        'Changing XHR onloadend event handler to onload event handler');
      offset = 'onload';
    }

    if (offset === 'onload' || offset === 'onprogress' ||
        offset === 'onreadystatechange') {
      var wrapper = misc.makeWrapperFor(val, function (e) {
        debugging.assert(e.isTrusted);

        if (eventMonitor.currentEvent instanceof EventId) {
          if (typeof val === 'function') {
            return val.apply(this, arguments);
          }
          return;
        }

        // Check if this Ajax response event should be blocked.
        var shouldBlockAjaxResponse = analysis.monitors.some(
          (monitor) => monitor.shouldBlockAjaxResponse(this, [e], wrapper));
        if (shouldBlockAjaxResponse) {
          // Skip execution of event handler.
          if (e.type === 'load') {
            var shadow = misc.getOrMakeShadow(this);
            shadow.isActive = false;
          }

          return;
        }

        // Execute event handler.
        var monitorArgs = [base, e, misc.getOrMakeShadow(base)];
        var exitOptions = analysis.notify('onEnterAjaxResponse', monitorArgs);
        try {
          if (typeof val === 'function') {
            return val.apply(this, arguments);
          }
        } finally {
          analysis.notify('onExitAjaxResponse', monitorArgs, exitOptions);

          if (e.type === 'load') {
            var shadow = misc.getOrMakeShadow(this);
            shadow.isActive = false;
          }
        }
      });
      return { base: base, offset: offset, val: wrapper };
    }

    if (offset === 'onabort') {
      return { base: base, offset: offset, val:
        misc.makeWrapperFor(val, (e) => {
          var monitorArgs = [base, misc.getOrMakeShadow(base)];
          var exitOptions = analysis.notify('onEnterAjaxAbort', monitorArgs);
          try {
            if (typeof val === 'function') {
              return val.apply(this, arguments);
            }
          } finally {
            analysis.notify('onExitAjaxAbort', monitorArgs, exitOptions);
          }
        })
      };
    }

    if (offset === 'onerror') {
      return { base: base, offset: offset, val:
        misc.makeWrapperFor(val, (e) => {
          var monitorArgs = [base, e, misc.getOrMakeShadow(base)];
          var exitOptions = analysis.notify('onEnterAjaxError', monitorArgs);
          try {
            if (typeof val === 'function') {
              return val.apply(this, arguments);
            }
          } finally {
            analysis.notify('onExitAjaxError', monitorArgs, exitOptions);
          }
        })
      };
    }

    if (offset === 'onloadstart' || offset === 'ontimeout') {
      return { base: base, offset: offset, val:
        misc.makeWrapperFor(val, (e) =>
          logger.error(
            util.format("XMLHttpRequest.%s event not supported", offset)))
      };
    }
  };
}

module.exports = {
  install: install,
  makePutFieldPreObserver: makePutFieldPreObserver
};
