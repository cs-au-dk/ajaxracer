// Internal
var debugging = require('../../common/debugging.js');
var dom = require('../utils/dom.js');
var logger = require('../dev/logger.js');
var List = require('../stdlib/list.js');
var misc = require('../utils/misc.js');
var natives = require('../utils/natives.js');
var symbols = require('../utils/symbols.js');

// External
var util = require('util');

/**
 * Called when a node is added to the DOM.
 * Returns true if the node is allowed to be inserted into the DOM, and false
 * otherwise.
 */
function addNodeToDOM(analysis, newNode, parentNode) {
  if (newNode instanceof natives.refs.HTMLElement.ref) {
    var injectedScripts = new List(newNode.querySelectorAll('script'));
    var shouldPreventInjectionOfAtLeastOneScript =
      injectedScripts.some(
        (script) => !addNodeToDOM(analysis, script, script.parentNode));
    debugging.assertFalse(shouldPreventInjectionOfAtLeastOneScript);
  }

  if (newNode instanceof natives.refs.HTMLIFrameElement.ref) {
    if (newNode.src.length > 0) {
      logger.warn(
        'Refusing to dynamically insert iframe with URL ' + newNode.src);
      return false;
    }
  } else if (newNode instanceof natives.refs.HTMLScriptElement.ref &&
             dom.isNodeAttachedToDocument(parentNode)) {
    var url = newNode.src;

    // Avoid loading Google Analytics for simplicity.
    if (url.indexOf('adform.net') >= 0 ||
        url.indexOf('chartbeat.com') >= 0 ||
        url.indexOf('google-analytics') >= 0 ||
        url.indexOf('static.chartbeat.com') >= 0 ||
        url.indexOf('tags.bkrtx.com/js/bk-coretag.js') >= 0 ||
        url.indexOf('track.adform.net') >= 0) {
      logger.warn('Refusing to load ' + url);
      return false;
    }

    if (newNode.src.trim().length > 0 &&
        (newNode.type === '' ||
         (newNode.type.toLowerCase().indexOf('javascript') >= 0 &&
         newNode.type.toLowerCase().indexOf('true') < 0))) {
      var url = newNode.src;

      var shadow = newNode[symbols.SHADOW];
      if (!shadow) {
        shadow = newNode[symbols.SHADOW] = {
          shadowed: newNode,
          shouldSignalResponseForUrl: {}
        };
      }

      var loadOptions = shadow.shouldSignalResponseForUrl[url] =
        analysis.notify('onResourceRequest', [url, shadow]);

      // Intentionally calling our own `addEventListener` here and below, such
      // that `onResourceResponse` will only execute when the script has been
      // executed, in case it is postponed by the event monitor.
      //
      // This also guarantees that there is always an event handler for the
      // 'load' and 'error' events.
      newNode.addEventListener('load', (e) => {
        if (url in shadow.shouldSignalResponseForUrl) {
          analysis.notify('onResourceResponse', [url, shadow, /*error=*/null],
                          loadOptions);
          delete shadow.shouldSignalResponseForUrl[url];
        }
      }, false);

      newNode.addEventListener('error', (e) => {
        if (url in shadow.shouldSignalResponseForUrl) {
          analysis.notify('onResourceResponse', [url, shadow, /*error=*/e],
                          loadOptions);
          delete shadow.shouldSignalResponseForUrl[url];
        }
      }, false);
    } else {
      // This is an inline script, which will be executed synchronously.
    }
  }

  return true;
}

function install(analysis) {
  document.write = function (value) {
    if (typeof value === 'number') {
      value = String(value);
    }
    debugging.assertEq(typeof value, 'string');
    if (value.indexOf('<script') >= 0 &&
        (value.indexOf('async') >= 0 || value.indexOf('defer') >= 0)) {
      logger.warn(
        'Injecting asynchronous or deferred script via document.write');
    }
    return natives.refs.document.write.apply(document, arguments);
  };

  Element.prototype.append = function () {
    debugging.assertUnreachable('Element.prototype.append not supported');
  };

  Element.prototype.prepend = function () {
    debugging.assertUnreachable('Element.prototype.prepend not supported');
  };

  Element.prototype.insertAdjacentHTML = function (position, text) {
    // Parse the text.
    var div = natives.refs.document.createElement.call(document, 'div');
    div.innerHTML = text;

    // Populate the fragment.
    var fragment = natives.refs.document.createDocumentFragment.call(document);
    new List(div.childNodes).forEach(
      (node) => natives.refs.Element.appendChild.call(fragment, node));

    // Insert the fragment.
    switch (position) {
      case 'beforebegin':
        if (this.parentElement !== null) {
          this.parentElement.insertBefore(fragment, this);
        } else {
          debugging.assertUnreachable();
        }
        break;

      default:
        debugging.assertUnreachable();
    }

    return undefined;
  };

  Element.prototype.insertAdjacentElement = function (position, element) {
    debugging.assert(false, 'Not implemented');
  };

  window.Node.prototype.appendChild = function (newNode) {
    if (newNode instanceof natives.refs.DocumentFragment.ref) {
      while (newNode.childNodes.length) {
        this.appendChild(newNode.childNodes[0]);
      }
      return newNode;
    }

    if (addNodeToDOM(analysis, newNode, this)) {
      try {
        return natives.refs.Node.appendChild.call(this, newNode);
      } finally {
        var boundingRect = null;
        if (newNode instanceof natives.refs.Element.ref) {
          // TODO: should also store `areaBefore` for mutate-dom operations.
          boundingRect = dom.getBoundingRect(newNode);
        } else if (this instanceof natives.refs.Element.ref &&
                   newNode instanceof natives.refs.Node.ref &&
                   newNode.nodeName !== "#comment") {
          boundingRect = dom.getBoundingRect(this);
        }
        if (boundingRect !== null) {
          analysis.notify('onDOMMutation', [this, newNode, boundingRect]);
        }
      }
    }
    return null;
  };

  window.Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (newNode instanceof natives.refs.DocumentFragment.ref) {
      while (newNode.childNodes.length) {
        this.insertBefore(newNode.childNodes[0], referenceNode);
      }
      return newNode;
    }

    if (addNodeToDOM(analysis, newNode, this)) {
      try {
        return natives.refs.Node.insertBefore.call(this, newNode,
                                                   referenceNode);
      } finally {
        var boundingRect = null;
        if (newNode instanceof natives.refs.Element.ref) {
          // TODO: should also store `areaBefore` for mutate-dom operations.
          boundingRect = dom.getBoundingRect(newNode);
        } else if (this instanceof natives.refs.Element.ref &&
                   newNode instanceof natives.refs.Node.ref &&
                   newNode.nodeName !== "#comment") {
          boundingRect = dom.getBoundingRect(this);
        }
        if (boundingRect !== null) {
          analysis.notify('onDOMMutation', [this, newNode, boundingRect]);
        }
      }
    }
    return null;
  };

  window.Node.prototype.replaceChild = function (newChild, oldChild) {
    var childNodes = new List(this.childNodes);
    debugging.assert(childNodes.indexOf(oldChild) >= 0);

    if (newChild instanceof natives.refs.DocumentFragment.ref) {
      var nextSibling = oldChild.nextSibling;

      // Replace `oldChild` by the first child node of `newChild`.
      var firstChildNode = newChild.childNodes[0];
      if (firstChildNode) {
        this.replaceChild(firstChildNode, oldChild);
      }

      while (newChild.childNodes.length) {
        if (nextSibling !== null) {
          this.insertBefore(newChild.childNodes[0], nextSibling);
        } else {
          this.appendChild(newChild.childNodes[0]);
        }
      }

      return oldChild;
    }

    if (addNodeToDOM(analysis, newChild, this)) {
      try {
        return natives.refs.Node.replaceChild.call(this, newChild, oldChild);
      } finally {
        var boundingRect = null;
        if (newChild instanceof natives.refs.Element.ref) {
          // TODO: should also store `areaBefore` for mutate-dom operations.
          boundingRect = dom.getBoundingRect(newChild);
        } else if (this instanceof natives.refs.Element.ref &&
                   newChild instanceof natives.refs.Node.ref &&
                   newChild.nodeName !== "#comment") {
          boundingRect = dom.getBoundingRect(this);
        }
        if (boundingRect !== null) {
          analysis.notify('onDOMMutation', [this, newChild, boundingRect]);
        }
      }
    }
    return null;
  };
}

function makePutFieldPreObserver(analysis) {
  return (iid, base, offset, val) => {
    if (base instanceof natives.refs.HTMLImageElement.ref && offset === 'src') {
      var shadow = base[symbols.SHADOW];
      if (!shadow) {
        shadow = base[symbols.SHADOW] = {
          shouldSignalResponseForUrl: [],
          shadowed: base
        };
      }

      // This cancels the request.
      // Simply fake that the resource has been loaded.
      if (base.src.length > 0 &&
          shadow.shouldSignalResponseForUrl.indexOf(base.src) >= 0) {
        debugging.assertEq(typeof base.onload, 'function');
        base.dispatchEvent(dom.getEvent(base, 'load'));
      }

      // Register default event handlers.
      if (typeof base.onload !== 'function') {
        var f = function () {};
        base.onload = analysis.putFieldPre(/*iid=*/null, base, 'onload', f).val;
      }

      if (typeof base.onerror !== 'function') {
        var g = function () {};
        base.onerror =
          analysis.putFieldPre(/*iid=*/null, base, 'onerror', g).val;
      }

      // Manually update the `src` property, such that the `complete` flag will
      // be set properly.
      base.src = val;

      var absoluteUrl = base.src;

      shadow.shouldSignalResponseForUrl.push(absoluteUrl);

      shadow.onResourceResponseOptions =
        analysis.notify('onResourceRequest', [/*url=*/absoluteUrl, shadow]);

      // If the server responds with "204 No Content", then the onload/onerror
      // event is not called. Manually monitor the loading of the event to
      // prevent this issue.
      var monitorId = natives.refs.setInterval.call(window, function () {
        if (base.complete) {
          // Check that we have not already called `onResourceResponse`. This
          // could have happened since the `load` or `error` event could have
          // been triggered.
          if (shadow.shouldSignalResponseForUrl.indexOf(absoluteUrl) >= 0) {
            debugging.assertEq(typeof base.onload, 'function');
            base.dispatchEvent(dom.getEvent(base, 'load'));
          }

          // Stop the timer.
          natives.refs.clearInterval.call(window, monitorId);
        }
      }, 1000);

      // Signal that the DOM has changed.
      analysis.notify('onDOMMutation',
                      [base.parentNode, base, dom.getBoundingRect(base)]);

      // Already manually updated the `src` property.
      return { skip: true };
    }
  };
}

module.exports = {
  install: install,
  makePutFieldPreObserver: makePutFieldPreObserver
};
