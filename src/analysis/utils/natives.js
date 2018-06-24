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

if (typeof window === 'undefined') {
  return;
}

// This script executes in the very beginning when the underlying web page
// starts to load, and stores a reference to relevant native functions that are
// used throughout the implementation. This is important to prevent accidentally
// invoking functions that belong to the web page.
//
// For example, the web page might do as follows:
//   // For debugging, log a message whenver a timer is set.
//   var _setTimeout = window.setTimeout;
//   window.setTimeout = function (f, delay) {
//     console.log('Timer');
//     return _setTimeout(f, delay);
//  };
//
// In this case, it is important not to invoke setTimeout() from the analysis.
// Instead, the analysis should do as follows:
//   refs.setTimeout.ref.call(window, myFunction, myDelay);
var refs = {
  cancelAnimationFrame: window.cancelAnimationFrame,
  cancelIdleCallback: window.cancelIdleCallback,
  clearImmediate: window.clearImmediate,
  clearInterval: window.clearInterval,
  clearTimeout: window.clearTimeout,
  eval: window.eval,
  getComputedStyle: window.getComputedStyle,
  requestAnimationFrame: window.requestAnimationFrame,
  requestIdleCallback: window.requestIdleCallback,
  scroll: window.scroll,
  setImmediate: window.setImmediate,
  setInterval: window.setInterval,
  setTimeout: window.setTimeout,
  Array: {
    concat: Array.prototype.concat,
    every: Array.prototype.every,
    filter: Array.prototype.filter,
    find: Array.prototype.find,
    findIndex: Array.prototype.findIndex,
    forEach: Array.prototype.forEach,
    from: Array.from,
    indexOf: Array.prototype.indexOf,
    join: Array.prototype.join,
    map: Array.prototype.map,
    pop: Array.prototype.pop,
    push: Array.prototype.push,
    reverse: Array.prototype.reverse,
    shift: Array.prototype.shift,
    slice: Array.prototype.slice,
    some: Array.prototype.some,
    sort: Array.prototype.sort,
    splice: Array.prototype.splice,
    toString: Array.prototype.toString,
    unshift: Array.prototype.unshift,
    ref: Array
  },
  console: {
    error: console.error,
    info: console.info,
    log: console.log,
    warn: console.warn,
    ref: console
  },
  CSSStyleDeclaration: {
    ref: CSSStyleDeclaration
  },
  document: {
    createDocumentFragment: window.document.createDocumentFragment,
    createElement: window.document.createElement,
    querySelector: window.document.querySelector,
    querySelectorAll: window.document.querySelectorAll,
    write: window.document.write,
    writeln: window.document.writeln,
    ref: window.document
  },
  location: {
    assign: window.location.assign,
    reload: window.location.reload,
    replace: window.location.replace
  },
  DocumentFragment: {
    ref: window.DocumentFragment
  },
  Element: {
    addEventListener: window.Element.prototype.addEventListener,
    appendChild: window.Element.prototype.appendChild,
    insertAdjacentHTML: window.Element.prototype.insertAdjacentHTML,
    insertAdjacentElement: window.Element.prototype.insertAdjacentElement,
    removeEventListener: window.Element.prototype.removeEventListener,
    setAttribute: window.Element.prototype.setAttribute,
    ref: window.Element
  },
  Event: {
    ref: window.Event
  },
  EventTarget: {
    addEventListener: window.EventTarget.prototype.addEventListener,
    removeEventListener: window.EventTarget.prototype.removeEventListener,
    ref: window.EventTarget
  },
  Function: {
    apply: window.Function.prototype.apply,
    call: window.Function.prototype.call,
    toString: window.Function.prototype.toString,
    ref: window.Function
  },
  HTMLCollection: {
    ref: window.HTMLCollection
  },
  HTMLElement: {
    focus: window.HTMLElement.prototype.focus,
    querySelectorAll: window.HTMLElement.prototype.querySelectorAll,
    remove: window.HTMLElement.prototype.remove,
    ref: window.HTMLElement
  },
  HTMLIFrameElement: {
    ref: window.HTMLIFrameElement
  },
  HTMLImageElement: {
    decode: window.HTMLImageElement.prototype.decode,
    ref: window.HTMLImageElement
  },
  HTMLInputElement: {
    ref: window.HTMLInputElement
  },
  HTMLLabelElement: {
    ref: window.HTMLLabelElement
  },
  HTMLLinkElement: {
    ref: window.HTMLLinkElement
  },
  HTMLSelectElement: {
    ref: window.HTMLSelectElement
  },
  HTMLScriptElement: {
    ref: window.HTMLScriptElement
  },
  Map: {
    get: window.Map.prototype.get,
    has: window.Map.prototype.has,
    set: window.Map.prototype.set,
    ref: window.Map
  },
  MessagePort: {
    ref: window.MessagePort
  },
  navigator: {
    permissions: {
      query: window.navigator.permissions.query,
      ref: window.navigator.permissions
    },
    ref: window.navigator
  },
  Node: {
    appendChild: window.Node.prototype.appendChild,
    insertBefore: window.Node.prototype.insertBefore,
    replaceChild: window.Node.prototype.replaceChild,
    ref: window.Node
  },
  NodeList: {
    forEach: window.NodeList.prototype.forEach,
    ref: window.NodeList
  },
  Object: {
    create: window.Object.create,
    defineProperties: window.Object.defineProperties,
    defineProperty: window.Object.defineProperty,
    ref: window.Object
  },
  Promise: {
    all: window.Promise.all,
    catch: window.Promise.prototype.catch,
    then: window.Promise.prototype.then,
    race: window.Promise.race,
    reject: window.Promise.reject,
    resolve: window.Promise.resolve,
    ref: window.Promise
  },
  Set: {
    add: window.Set.prototype.add,
    forEach: window.Set.prototype.forEach,
    has: window.Set.prototype.has,
    ref: window.Set
  },
  XMLHttpRequest: {
    abort: window.XMLHttpRequest.prototype.abort,
    open: window.XMLHttpRequest.prototype.open,
    send: window.XMLHttpRequest.prototype.send,
    ref: window.XMLHttpRequest,
    DONE: window.XMLHttpRequest.DONE,
    HEADERS_RECEIVED: window.XMLHttpRequest.HEADERS_RECEIVED,
    LOADING: window.XMLHttpRequest.LOADING,
    OPENED: window.XMLHttpRequest.OPENED
  }
};

function disableUndesirableSideEffects() {
  window.Math.random = (function (seed) {
    return function () {
      seed = Math.sin(seed) * 10000;
      return seed - Math.floor(seed);
    };
  })(42);

  HTMLFormElement.prototype.submit = function () {
    console.warn('form.submit() called');
    // do not submit forms during analysis
  };

  HTMLElement.prototype.click = function () {
    console.warn('element.click() called');
    // do not follow links during analysis
  };

  refs.EventTarget.addEventListener.call(document, 'click', function (e) {
    // do not follow links during analysis
    if (e && e.target instanceof HTMLAnchorElement) {
      e.preventDefault();
    }
  }, false);

  window.alert = function () {
    console.warn('window.alert() called');
    return null; // do not open alerts during analysis
  };

  window.confirm = function () {
    console.warn('window.confirm() called');
    return true;
  };

  window.open = function () {
    console.warn('window.open() called');
    return null; // do not open windows during analysis
  };

  window.print = function () {
    console.warn('window.print() called');
    return null; // do not open print dialog during analysis
  };

  History.prototype.back = function () {
    console.warn('history.back() called');
  };

  History.prototype.forward = function () {
    console.warn('history.forward() called');
  };

  History.prototype.go = function () {
    console.warn('history.go() called');
  };

  /*
  History.prototype.pushState = function () {
    console.warn('history.pushState() called');
  };
  */

  History.prototype.replaceState = function () {
    console.warn('history.replaceState() called');
  };

  function MutationObserver(callback) {
    console.warn('Returning a dummy MutationObserver.');
  }

  navigator.serviceWorker.ready.then = function () {
    console.warn('Skipping service worker registration.');
    return new refs.Promise.ref(function (resolve, reject) {
      // Return a promise that never gets resolved.
    });
  };

  navigator.serviceWorker.register = function () {
    console.warn('Skipping service worker registration.');
    return new refs.Promise.ref(function (resolve, reject) {
      // Return a promise that never gets resolved.
    });
  };

  MutationObserver.prototype.observe = function (target, options) {};
  MutationObserver.prototype.disconnect = function () {};
  MutationObserver.prototype.takeRecords = function () {
    throw new Error('Not implemented');
  };

  window.MutationObserver = MutationObserver;

  // Disable calls to element.focus(). Otherwise, a blur event happens when
  // interacting with the developer toolbar in the browser in mode DEBUGGING.
  HTMLElement.prototype.focus = function () {
    console.warn('Skipping call to focus().');
  };

  // Pretend that this browser does not support MessagePort.
  delete window.MessageChannel;
  delete window.MessagePort;
  delete window.postMessage;

  // Pretend that this browser does not support requestIdleCallback.
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;

  delete window.fetch;
  delete window.Request;
  delete window.Response;
}

module.exports = {
  disableUndesirableSideEffects: disableUndesirableSideEffects,
  refs: refs
};
