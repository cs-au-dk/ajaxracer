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
var dom = require('../utils/dom.js');
var List = require('../stdlib/list.js');
var logger = require('../dev/logger.js');
var misc = require('../utils/misc.js');
var natives = require('../utils/natives.js');
var symbols = require('../utils/symbols.js');

// External
var util = require('util');

function install(analysis) {
  var wrappers = analysis.wrappers;

  Element.prototype.setAttribute = function (name, value) {
    var handledByPropertyAssignment = false;
    if (dom.isEventHandlerAttribute(this, name)) {
      try {
        var f = eval(util.format("(function () { %s })", value));
        var aret = analysis.putFieldPre(/*iid=*/null, this, name, f);
        if (aret) {
          if (!aret.skip) {
            this[name] = aret.val;
          }
        } else {
          this[name] = f;
        }

        handledByPropertyAssignment = true;
      } catch (e) {
      }
    }

    if (!handledByPropertyAssignment) {
      var aret = analysis.putFieldPre(/*iid=*/null, this, name, value);
      if (aret) {
        if (!aret.skip) {
          natives.refs.Element.setAttribute.call(aret.base, aret.offset,
                                                 aret.val);
        }
      } else {
        natives.refs.Element.setAttribute.call(this, name, value);
      }
    }
  };

  /**
   * Replace the addEventListener function with a custom one.
   */
  window.EventTarget.prototype.addEventListener =
      function (type, listener, useCapture) {
    var base = this;

    if (typeof listener === 'object' && listener !== null &&
        typeof listener.handleEvent === 'function') {
      var obj = listener;
      listener = (e) => obj.handleEvent.call(obj, e);
    }

    if (typeof listener !== 'function') {
      logger.warn('Skipping non-function event handler registration');
      return;
    }

    // Skip some event handler registrations for simplicity.
    if (misc.isNative(base) && dom.skipEventHandlerRegistration(base, type)) {
      logger.warn(util.format('Skipping %s event handler registration', type));
      return;
    }

    var wrapper = null;
    if (misc.isWrapper(listener)) {
      wrapper = listener;
    } else if (wrappers.has(type, listener)) {
      wrapper = wrappers.get(type, listener);
    } else {
      wrapper = misc.makeWrapperFor(listener, function (e) {
        // Check if this is a script response event that should be blocked.
        if (this instanceof natives.refs.HTMLScriptElement.ref) {
          var shouldBlockScriptResponse = analysis.monitors.some(
            (monitor) => monitor.shouldBlockScriptResponse(this, [e], wrapper));
          if (shouldBlockScriptResponse) {
            // Skip execution of event handler.
            return;
          }
        }

        // Execute event listener.
        var exitOptions = analysis.notify('onEnterEventListener',
                                          [base, e], enterOptions);
        try {
          return listener.apply(this, arguments);
        } finally {
          analysis.notify('onExitEventListener', [], exitOptions);
        }
      });

      var enterOptions =
        analysis.notify('onRegisterEventListener',
                        [base, type, listener, { wrapper: wrapper }]);

      // Record that `wrapper` has been registered instead of `listener`,
      // such that we can detach `wrapper` instead of `listener`, if the
      // program attempts to detach `listener`.
      wrappers.set(type, listener, wrapper);
    }

    return natives.refs.Element.addEventListener.call(this, type, wrapper, useCapture);
  };

  /**
   * Replace the removeEventListener function with a custom one.
   */
  window.EventTarget.prototype.removeEventListener = function (type, listener, useCapture) {
    var listenerToBeRemoved = listener;
    if (wrappers.has(type, listener)) {
      listenerToBeRemoved = wrappers.get(type, listener);
    }
    return natives.refs.Element.removeEventListener.call(this, type, listenerToBeRemoved, useCapture);
  };


  // Arguments passed to Object.create must be plain objects.
  window.Object.create = function () {
    return misc.callFunctionWithPlainObjects(
      natives.refs.Object.create, this, arguments);
  };

  // Arguments passed to Object.defineProperties must be plain objects.
  window.Object.defineProperties = function () {
    return misc.callFunctionWithPlainObjects(
      natives.refs.Object.defineProperties, this, arguments);
  };

  // Arguments passed to Object.defineProperty must be plain objects.
  window.Object.defineProperty = function () {
    return misc.callFunctionWithPlainObjects(
      natives.refs.Object.defineProperty, this, arguments);
  };
}

/**
 * Handles event handler registrations that happen via property assignments.
 */
function makePutFieldPreObserver(analysis) {
  return (iid, base, offset, val) => {
    // Ignore assignments to XMLHttpRequest objects. These are handled by the
    // XHR interception.
    if (base instanceof natives.refs.XMLHttpRequest.ref) {
      return;
    }

    if (dom.isEventHandlerAttribute(base, offset)) {
      var type = offset.substring(2);

      // Skip some event handler registrations for simplicity.
      if (misc.isNative(base) && typeof val === 'function' &&
          dom.skipEventHandlerRegistration(base, type)) {
        logger.warn(util.format('Skipping %s event handler registration',
                                type));
        return { base: base, offset: offset, val: function () {} };
      }

      var wrapper = null;
      if (typeof val === 'function' && misc.isWrapper(val)) {
        wrapper = val;
      } else {
        wrapper = misc.makeWrapperFor(val, function (e) {
          var receiver = this;

          if (this instanceof natives.refs.HTMLImageElement.ref) {
            if (e.type === 'load' || e.type === 'error') {
              var shadow = misc.getOrMakeShadow(this);
              debugging.assert(typeof shadow, 'object');

              if (shadow.shouldSignalResponseForUrl.indexOf(this.src) >= 0) {
                debugging.assert('onResourceResponseOptions' in shadow);

                analysis.notify(
                  'onResourceResponse',
                  [this.src, shadow, /*error=*/e.type === 'error' ? e : null],
                  shadow.onResourceResponseOptions);

                // Remove URL from `shouldSignalResponseForUrl`.
                shadow.shouldSignalResponseForUrl.splice(
                  shadow.shouldSignalResponseForUrl.indexOf(this.src), 1);
              } else {
                // We have already emitted the `load` or `error` event.
                return;
              }
            }
          }

          // Check if this is a script response event that should be blocked.
          if (this instanceof natives.refs.HTMLScriptElement.ref) {
            var shouldBlockScriptResponse = analysis.monitors.some(
              (monitor) => monitor.shouldBlockScriptResponse(this, [e], wrapper));
            if (shouldBlockScriptResponse) {
              // Skip execution of event handler.
              return;
            }
          }

          // Execute event listener.
          var exitOptions = analysis.notify('onEnterEventListener',
                                            [receiver, e], enterOptions);
          try {
            if (typeof val === 'function') {
              return val.apply(this, arguments);
            }
          } finally {
            analysis.notify('onExitEventListener', [], exitOptions);
          }
        });
      }

      var enterOptions =
        analysis.notify('onRegisterEventListener',
                        [base, type, val, { wrapper: wrapper }]);

      return { base: base, offset: offset, val: wrapper };
    }
  };
}

module.exports = {
  install: install,
  makePutFieldPreObserver: makePutFieldPreObserver
};
