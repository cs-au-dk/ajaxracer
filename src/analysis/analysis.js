// Internal
var { config, mode, phase } = require('./argv.js');
var adverseModeExecution = require('./modes/adverse-mode-execution.js');
var defaultInterceptor = require('./interceptors/default.js');
var debugging = require('../common/debugging.js');
var dom = require('./utils/dom.js');
var eventHandlerRegistrationMonitor = require('./monitors/event-handler-registration-monitor.js');
var EventId = require('./data-types/event-id.js');
var eventMonitor = require('./monitors/event-monitor.js');
var Future = require('./stdlib/future.js');
var List = require('./stdlib/list.js');
var logger = require('./dev/logger.js');
var loadMonitor = require('./monitors/load-monitor.js');
var observationModeExecution = require('./modes/observation-mode-execution.js');
var misc = require('./utils/misc.js');
var natives = require('./utils/natives.js');
var SmartSet = require('./stdlib/smart-set.js');
var symbols = require('./utils/symbols.js');
var synchronousModeExecution = require('./modes/synchronous-mode-execution.js');
var promiseInterceptor = require('./interceptors/promise.js');
var resourceInterceptor = require('./interceptors/resource.js');
var timerInterceptor = require('./interceptors/timer.js');
var xhrInterceptor = require('./interceptors/xhr.js');

// External
var util = require('util');

function AjaxRacer() {
  this.awaitingScreenshotTo = null;
  this.error = null;
  this.eventHandlerRegistrationMonitor = eventHandlerRegistrationMonitor;
  this.isFinished = false;
  this.isLoaded = false;
  this.monitors = new List([eventMonitor, eventHandlerRegistrationMonitor,
                            loadMonitor]);
  this.nextElementId = 1;
  this.nextPromiseId = 1;
  this.putFieldPreObservers =
    new List([defaultInterceptor.makePutFieldPreObserver(this),
              resourceInterceptor.makePutFieldPreObserver(this),
              xhrInterceptor.makePutFieldPreObserver(this)]);
  this.result = null;
  this.wrappers = {
    _wrappersForTypes: new natives.refs.Map.ref(),
    has: function (type, listener) {
      return this._wrappersForTypes.has(type) &&
             this._wrappersForTypes.get(type).has(listener);
    },
    get: function (type, listener) {
      if (this.has(type, listener)) {
        return this._wrappersForTypes.get(type).get(listener);
      }
      return null;
    },
    set: function (type, listener, wrapper) {
      if (this._wrappersForTypes.has(type)) {
        this._wrappersForTypes.get(type).set(listener, wrapper);
      } else {
        var wrappers = new natives.refs.Map.ref();
        wrappers.set(listener, wrapper);
        this._wrappersForTypes.set(type, wrappers);
      }
    }
  };

  debugging.registerErrorHandler(function (error) {
    this.error = error;
  }.bind(this));

  // Export symbols module for debugging purposes.
  this.symbols = symbols;

  defaultInterceptor.install(this);
  promiseInterceptor.install(this);
  resourceInterceptor.install(this);
  timerInterceptor.install(this);
  xhrInterceptor.install(this);

  natives.disableUndesirableSideEffects();

  // Run observation or adverse mode once the web page has finished loading.
  loadMonitor.then(function (ms) {
    logger.info(util.format('Web page loaded in %s ms', ms));

    // Remove load monitor. If phase = DEBUGGING then let the monitor run,
    // such that it can warn if a system event handler happens to execute
    // after the page has been loaded (this should not happen, if no user
    // events are performed).
    if (phase.get() === 1 || phase.get() === 2) {
      debugging.assert(this.monitors.pop() === loadMonitor);
    }

    // Signal to protractor script that the web page has been fully loaded.
    this.isLoaded = true;
  }.bind(this));
}

/**
 * Utility used by the Protractor driver to start the analysis that is supposed
 * to run once the web page has been fully loaded.
 */
AjaxRacer.prototype.startMode = function (thePhase, theMode, options) {
  if (!thePhase) {
    thePhase = phase.get();
  }

  if (thePhase === 2 && !theMode) {
    theMode = mode.get();
  }

  // Unregister the load monitor. If startMode has already been called
  // manually from the developer toolbar, then this has already been done.
  if (this.monitors.last() === loadMonitor) {
    this.monitors.pop();
  }

  var executionMode = null;
  if (thePhase === 1) {
    executionMode = observationModeExecution;
  } else {
    if (theMode === mode.ADVERSE) {
      executionMode = adverseModeExecution;
    } else {
      executionMode = synchronousModeExecution;
    }
  }

  executionMode.run(this, options).then(function (result) {
    console.log("DONE");
    this.isFinished = true;
    this.result = result;
  }.bind(this));
};

/**
 * Takes a screenshot.
 *
 * Returns a promise that resolves once the screenshot has been taken.
 */
AjaxRacer.prototype.takeScreenshot = function (id) {
  debugging.assertEq(typeof id, 'string');
  this.awaitingScreenshotTo = id;

  // The screenshot procedure will scroll to offset (0,0), so we well need to
  // restore the scroll offset afterwards.
  var oldScroll = [window.scrollX, window.scrollY];

  return ((analysis) =>
    new Future((resolve, reject) => {
      var intervalId = natives.refs.setInterval.call(window, () => {
        if (analysis.awaitingScreenshotTo === null) {
          natives.refs.scroll.apply(window, oldScroll);
          natives.refs.clearInterval.call(window, intervalId);
          resolve();
        }
      }, 1000);
    })
  )(this);
};

/**
 * Utility used by the Protractor driver to get the result of the analysis.
 */
AjaxRacer.prototype.getOutputAsString = function () {
  return JSON.stringify(this.result, undefined, 2);
};

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.scriptReady = function (executor) {
  var shouldBlockCurrentScript = this.monitors.some(
    (monitor) => monitor.shouldBlockCurrentScript(executor));

  if (!shouldBlockCurrentScript) {
    executor();
  }
};

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.scriptEnter = function (iid, val, origFileName) {
  var isEval = J$.isInsideEval ||
               (J$.smap && typeof J$.smap[J$.sid].evalSid === 'number');
  if (!isEval) {
    var currentScript = eventMonitor.getCurrentScript();
    debugging.assert(
      currentScript instanceof natives.refs.HTMLScriptElement.ref);

    // If it is a synchronous script tag in the HTML, then invoke
    // `onElementDeclaration` (this will take care of wrapping event handlers
    // that have been registered via HTML attributes).
    var isStaticHTMLElement = document.readyState === 'loading' &&
                              misc.getShadow(currentScript) === null;
    if (isStaticHTMLElement) {
      if (currentScript.id.length === 0) {
        currentScript.id =
          util.format('dynamic-element-%s', this.nextElementId++);
      }

      var isSynchronous = !currentScript.async;
      if (isSynchronous) {
        this.onElementDeclaration(currentScript.id);
      }
    }

    this.notify('onEnterScript', [origFileName]);
  }
};

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.scriptExit = function (iid, wrappedExceptionVal) {
  var isEval = J$.isInsideEval ||
               (J$.smap && typeof J$.smap[J$.sid].evalSid === 'number');
  if (!isEval) {
    this.notify('onExitScript');
  }
};

/**
 * Called by the instrumentation framework when an HTML element is declared.
 */
AjaxRacer.prototype.onElementDeclaration = function (id) {
  var element = document.getElementById(id);

  if (element instanceof natives.refs.HTMLScriptElement.ref) {
    var shadow = misc.getOrMakeShadow(element);
    shadow.resourceResponseEventId = new EventId();
  }

  ['onclick', 'onerror', 'onkeydown', 'onkeypress', 'onkeyup', 'onload',
   'onmousedown', 'onmouseup'].forEach((name) => {
    if (typeof element[name] === 'function') {
      // Simulate that we are entering a piece of JavaScript. Otherwise, the
      // call to `putFieldPre` below would happen at a time where no JavaScript
      // is executing.
      var scriptId = util.format('element-decl-%s', id);
      this.notify('onEnterScript', [scriptId]);

      // Replace the [name] event handler with a wrapper.
      var listener = element[name];

      // Avoid that `putFieldPre` will consider the assignment a no-op.
      element[name] = null;

      // Assign the wrapper.
      element[name] =
        this.putFieldPre(/*iid=*/null, element, name, listener).val;

      // Simulate that we are exiting a piece of JavaScript.
      this.notify('onExitScript');
    }
  });

  this.removeInjectedScripts();
};

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.removeInjectedScripts = function (root) {
  if (!(root instanceof natives.refs.HTMLElement.ref)) {
    root = document;
  }
  // Delete all synthetic scripts inserted by the instrumentation.
  var scripts = root.querySelectorAll(
    '[data-ajaxracer="1"]');
  natives.refs.NodeList.forEach.call(scripts, (script) =>
    natives.refs.HTMLElement.remove.call(script));
};

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.literal = function (iid, val, hasGetterSetter) {
  if (misc.isObject(val)) {
    misc.markNotNative(val);
  }
};

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.invokeFunPre =
    function (iid, f, base, args, isConstructor, isMethod, functionIid,
              functionSid) {
  if (typeof f === 'function' && misc.isWrapper(f)) {
    return { f: misc.unwrap(f), base: base, args: args };
  }
};

AjaxRacer.prototype.invokeFun =
    function (iid, f, base, args, result, isConstructor, isMethod, functionIid,
              functionSid) {
  if (isConstructor) {
    debugging.assert(misc.isObject(result));
    misc.markNotNative(result);
  }

  /*
  if (typeof f === 'function' &&
      natives.refs.Function.toString.call(f).indexOf('native') >= 0 &&
      result instanceof natives.refs.Promise.ref) {
    logger.warn('Native function returns a Promise');
  }
  */
}

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.getFieldPre =
    function (iid, base, offset, isComputed, isOpAssign, isMethodCall) {
  if (base === document && offset === 'currentScript' &&
      document.currentScript === null &&
      eventMonitor.getCurrentScript() !== null) {
    debugging.assertUnreachable();
  }

  if (base instanceof natives.refs.HTMLElement.ref && offset === 'style') {
    var style = base.style;
    var shadow = misc.getOrMakeShadow(style);
    shadow.element = base;
    return { skip: true, result: style };
  }
};

/**
 * Called by the instrumentation framework.
 */
AjaxRacer.prototype.putFieldPre =
    function (iid, base, offset, val) {
  logger.warnIf(offset === Symbol.species,
                'Symbol.species might require special handling');

  // Ignore this assignment if it does not change the value of the field.
  if (misc.isObject(base) && base[offset] === val && offset !== 'innerHTML') {
    return;
  }

  // The following lines of code forwards this call to the observers in
  // `putFieldPreObservers`.
  var aret = null;
  for (var i = 0; i < this.putFieldPreObservers.length; ++i) {
    var result = this.putFieldPreObservers.get(i).apply(this, arguments);

    // Only one of the observers should become activated.
    if (result) {
      debugging.assert(!aret);
      aret = result;
    }
  }

  // If one of the observers were activated, then return.
  if (aret) {
    if (misc.isObject(aret)) {
      return aret;
    }
    return;
  }

  // Check that this assignment does not look like an event handler
  // registration.
  logger.warnIf(
    dom.looksLikeEventHandlerAttributeAssignment(base, offset, val) ||
      base instanceof natives.refs.MessagePort.ref,
    util.format("Should handle assignments that register %s event handlers.",
                offset));

  if ((base === window || base instanceof natives.refs.HTMLElement.ref) &&
      offset === 'scrollTop') {
    logger.warn('Ignoring assignment to scrollTop');
    return { skip: true };
  }

  if (base === document.location && offset === 'hash') {
    logger.warn('Ignoring assignment to document.location.hash');
    return { skip: true };
  }

  if (base instanceof HTMLElement) {
    debugging.assertNe(offset, 'outerHTML',
                       'Not handled: assignment to outerHTML.');
    switch (offset) {
      case 'className':
        if (dom.isNodeAttachedToDocument(base)) {
          // Store the visibility of each descendant of `base`
          // (incl. base itself).
          var wasInvisible = new SmartSet();
          dom.dfs(base, (elem) => {
            if (!dom.isVisible(elem)) {
              wasInvisible.add(elem);
            }
          });

          // Manually perform the assignment.
          base.className = val;

          // If an element becomes visible, then emit `mutateDOM`.
          var hasBecomeVisible = new SmartSet();
          dom.dfs(base, (elem) => {
            if (wasInvisible.has(elem) && dom.isVisible(elem)) {
              hasBecomeVisible.add(elem);
            }
          });

          // If an element in `hasBecomeVisible` has a parent element that is
          // also in `hasBecomeVisible`, then get rid of it.
          hasBecomeVisible = hasBecomeVisible.filter((elem) => {
            while (elem !== base && elem.parentElement !== null) {
              if (hasBecomeVisible.has(elem.parentElement)) {
                return false;
              }
              elem = elem.parentElement;
            }
            return true;
          });

          hasBecomeVisible.forEach(function (elem) {
            this.notify('onDOMMutation',
                        [elem, null, dom.getBoundingRect(elem)]);
          }.bind(this));

          // Skip the assignment because we have already performed it manually.
          return { skip: true };
        }
        break;

      case 'innerHTML':
        this.emitDOMMutationNotification(base);

        // Manually perform the assignment.
        base.innerHTML = val;

        // Emit `putFieldPre` for the 'src' property of dynamically loaded
        // images.
        new List(natives.refs.HTMLElement.querySelectorAll.call(base, 'img'))
          .forEach((img) => {
            if (img.src.length > 0) {
              var newSrc = img.src;

              // Such that the `putFieldPre` hook will think the value changes.
              img.src = '';

              // Assign the wrapper.
              var aret = this.putFieldPre(/*iid=*/null, img, 'src', newSrc);
              if (aret) {
                if (!aret.skip) {
                  img.src = aret.val;
                }
              } else {
                img.src = newSrc;
              }
            }
          });

        // Clean up.
        this.removeInjectedScripts(base);

        this.emitDOMMutationNotification(base);

        // Skip the assignment, since we have already performed it above.
        return { skip: true };
    }
  }

  if (base instanceof natives.refs.CSSStyleDeclaration.ref &&
      offset === 'display') {
    var shadow = misc.getShadow(base);
    if (shadow && shadow.element) {
      var element = shadow.element;
      var wasInvisible = !dom.isVisible(element);

      // Manually perform the assignment.
      base.display = val;

      if (wasInvisible && dom.isVisible(element)) {
        this.notify('onDOMMutation',
                    [element, null, dom.getBoundingRect(element)]);
      }
    }
  }
};

AjaxRacer.prototype.emitDOMMutationNotification = function (base) {
  var area = dom.getBoundingRect(base);
  if (area.height === 0) {
    // Could be because its children are floating.
    new List(base.children).forEach((child) => {
      var childArea = dom.getBoundingRect(child);
      if (childArea.height) {
        this.notify('onDOMMutation', [base, null, childArea]);
      }
    });
  } else {
    this.notify('onDOMMutation', [base, null, area]);
  }
};

/**
 * A utilify function to dispatch notifications to the monitors.
 */
AjaxRacer.prototype.notify = function (hook, args, monitorOptions) {
  var result = {};
  this.monitors.forEach((monitor) => {
    if (typeof monitorOptions === 'object') {
      args.push(monitorOptions[monitor.id()]);
    }
    try {
      result[monitor.id()] = monitor[hook].apply(monitor, args)
    } catch (e) {
      logger.error(e);
    } finally {
      if (typeof monitorOptions === 'object') {
        args.pop();
      }
    }
  });
  return result;
};

natives.refs.EventTarget.addEventListener.call(document, 'DOMContentLoaded',
    function () {
  // Disable scroll bars.
  document.body.style.overflow = 'hidden';
},false);

module.exports = AjaxRacer;
