// Internal
var debugging = require('../../common/debugging.js');
var List = require('../stdlib/list.js');
var misc = require('../utils/misc.js');
var natives = require('./natives.js');
var symbols = require('./symbols.js');

// External
var charfunk = require('charfunk');

function dfs(element, callback) {
  debugging.assertEq(typeof element, 'object');
  callback(element);
  for (var i = 0; i < element.children.length; ++i) {
    dfs(element.children[i], callback);
  }
}

function getBoundingRect(node) {
  var area = node.getBoundingClientRect();
  return {
    x: Math.round(area.x * 10) / 10,
    y: Math.round(area.y * 10) / 10,
    width: Math.round(area.width * 10) / 10,
    height: Math.round(area.height * 10) / 10
  };
}

/**
 * Given event target and event type returns an event object,
 * or null, if the type is not supported.
 */
function getEvent(target, type, options) {
  var htmlElement = document.querySelector('html');
  var bodyElement = document.querySelector('body');

  var path = [target, document, window];

  switch (type) {
    case 'blur':
    case 'focus':
      var eventObject = new FocusEvent(type, {
        bubbles: false, cancelable: false, composed: true,
        sourceCapabilities: new InputDeviceCapabilities(), view: window
      });
      Object.defineProperties(eventObject, {
        path: { value: path, writable: true },
        srcElement: { value: target, writable: true },
        target: { value: target, writable: true }
      });
      return eventObject;

    case 'change':
      if (target instanceof natives.refs.Element.ref) {
        var tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'select') {
          var eventObject = new Event(type, {
            bubbles: true, cancelable: false, composed: false
          });
          Object.defineProperties(eventObject, {
            currentTarget: target,
            path: { value: path, writable: true },
            srcElement: { value: target, writable: true },
            target: { value: target, writable: true }
          });
          return eventObject;
        }
      }
      break;

    case 'click':
      if (!(target instanceof natives.refs.Element.ref)) {
        // When the user is issuing a click on the screen,
        // then the <html> element is the target.
        target = htmlElement;
        path = [htmlElement, document, window];
      }

      var eventObject = new MouseEvent(type, {
        bubbles: true, cancelable: true, composed: true, view: window
      });
      Object.defineProperties(eventObject, {
        path: { value: path, writable: true },
        srcElement: { value: target, writable: true },
        target: { value: target, writable: true },
        toElement: { value: target, writable: true }
      });
      return eventObject;

    case 'load':
      if (target instanceof natives.refs.Element.ref) {
        var tagName = target.tagName.toLowerCase();
        if (tagName === 'iframe' || tagName === 'img') {
          var eventObject = new Event(type, {
            bubbles: false, cancelable: false
          });
          Object.defineProperties(eventObject, {
            currentTarget: target,
            path: { value: path, writable: true },
            srcElement: { value: target, writable: true },
            target: { value: target, writable: true }
          });
          return eventObject;
        }
      }
      break;

    case 'keydown':
    case 'keypress':
    case 'keyup':
        if (!(target instanceof natives.refs.Element.ref)) {
            if (bodyElement) {
                target = bodyElement;
                path = [bodyElement, htmlElement, document, window];
            } else {
                return null;
            }
        }

        var eventObject = new KeyboardEvent(type, {
            bubbles: true,
            cancelable: true,
            charCode: 0,
            code: options ? options.code : 'KeyA',
            composed: true,
            ctrlKey: options ? options.ctrlKey : false,
            key: options ? options.key : 'a',
            metaKey: options ? options.metaKey : false,
            repeat: options ? options.repeat : false,
            shiftKey: options ? options.shiftKey : false,
            sourceCapabilities: new InputDeviceCapabilities(),
            view: window,
            which: options ? options.which : 65
        });
        Object.defineProperties(eventObject, {
            keyCode: { value: 65, writable: true },
            path: { value: path, writable: true },
            srcElement: { value: target, writable: true },
            target: { value: target, writable: true },
            which: { value: 65, writable: true }
        });
        return eventObject;

    case 'mousedown':
    case 'mouseup':
      if (!(target instanceof natives.refs.Element.ref)) {
        // When the user is issuing a click on the screen,
        // then the <html> element is the target.
        target = htmlElement;
        path = [htmlElement, document, window];
      }

      var eventObject = new MouseEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        sourceCapabilities: new InputDeviceCapabilities(), view: window
      });
      Object.defineProperties(eventObject, {
        path: { value: path, writable: true },
        srcElement: { value: target, writable: true },
        target: { value: target, writable: true },
        toElement: { value: target, writable: true }
      });
      return eventObject;
  }
  return null;
}

function getStaticElementId(element) {
  debugging.assert(typeof element === 'object',
                   'Parameter "element" must be a DOM object.');

  if (typeof element.dataset === 'object' &&
      typeof element.dataset.ajaxRacerId === 'string') {
    return element.dataset.ajaxRacerId;
  }
  return null;
}

function getUniqueCssPath(element) {
  debugging.assert(typeof element === 'object',
                   'Parameter "element" must be a DOM object.');

  var selector;
  if (element == natives.refs.document.ref) {
    selector = 'document';
  } else if (element.tagName.indexOf(':') < 0) {
    selector = element.tagName.toLowerCase();
  }

  if (element.id) {
    if (element.id.indexOf(' ') >= 0) {
      var first = element.id.split(' ')[0].trim();
      if (first) {
        selector += "[id*=\"" + first + "\"]"
      }
    } else {
      selector += "#" + element.id;
    }
  }

  if (element instanceof natives.refs.Element.ref) {
    var classes = natives.refs.Array.join.call(element.classList, ".");
    if (classes) {
      selector += "." + classes;
    }
  }

  if (element.parentNode && element.parentNode.nodeName != "#document") {
    var isChildElementBeforeElement = true;
    var matchingChildren =
      new List(element.parentNode.children).filter((childElement) => {
        if (childElement == element) {
          isChildElementBeforeElement = false;
        }
        return isChildElementBeforeElement && childElement.matches(selector);
      });

    if (matchingChildren.length > 1) {
      selector += ":nth-child(" + (matchingChildren.length + 1) + ")";
    }

    var parentSelector = getUniqueCssPath(element.parentNode);
    selector = parentSelector + " > " + selector;
  }

  return selector;
}

/**
 * Highlights a given DOM element.
 *
 * Returns a function that removes the highlighting.
 */
function highlightElement(element) {
  debugging.assert(typeof element === 'object',
                   'Parameter "element" must be a DOM object.');

  if (element instanceof natives.refs.HTMLElement.ref) {
    var oldColor = element.style.outlineColor;
    var oldOffset = element.style.outlineOffset;
    var oldStyle = element.style.outlineStyle;
    var oldWidth = element.style.outlineWidth;

    // Highlight element.
    element.style.outline = '5px solid red';

    return () => {
      element.style.outlineColor = oldColor;
      element.style.outlineOffset = oldOffset;
      element.style.outlineStyle = oldStyle;
      element.style.outlineWidth = oldWidth;
    };
  }

  return () => null;
}

// TODO: Incomplete.
function isEventHandlerAttribute(object, attribute) {
  var result = false;
  if (object === document || object instanceof natives.refs.HTMLElement.ref) {
    result |= attribute === 'onclick' || attribute === 'onfocus' ||
              attribute === 'onkeydown' || attribute === 'onkeypress' ||
              attribute === 'onkeyup'|| attribute === 'onmousedown' ||
              attribute === 'onmousemove' || attribute === 'onmouseout' ||
              attribute === 'onmouseover' || attribute === 'onmouseup' ||
              attribute === 'onselectstart';
  }
  if (object instanceof natives.refs.HTMLIFrameElement.ref ||
      object instanceof natives.refs.HTMLImageElement.ref ||
      object instanceof natives.refs.HTMLLinkElement.ref) {
    result |= attribute === 'onerror' || attribute === 'onload';
  }
  if (object instanceof natives.refs.HTMLScriptElement.ref) {
    result |= attribute === 'onerror' || attribute === 'onload' ||
              attribute === 'onreadystatechange';
  }
  if (object instanceof natives.refs.MessagePort.ref) {
    result |= attribute === 'onmessage' || attribute === 'onmessageerror';
  }
  if (object instanceof natives.refs.XMLHttpRequest.ref) {
    result |= attribute === 'onreadystatechange';
  }
  if (object === window ||
      (typeof object === 'object' && typeof object.Window === 'function' &&
       object instanceof object.Window)) {
    result |= attribute === 'onbeforeunload' || attribute === 'onerror' ||
              attribute === 'onload' || attribute === 'onresize';
  }
  return result;
}

function isNodeAttachedToDocument(node) {
  if (node === document) {
    return true;
  }
  if (node.parentNode !== null) {
    return isNodeAttachedToDocument(node.parentNode);
  }
  return false;
}

/**
 * Author: Jason Farrell
 * Author URI: http://useallfive.com/
 *
 * Description: Checks if a DOM element is truly visible.
 * Package URL: https://github.com/UseAllFive/true-visibility
 */
function isVisible(node) {

  'use strict';

  /**
   * Checks if a DOM element is visible. Takes into
   * consideration its parents and overflow.
   *
   * @param (el)      the DOM element to check if is visible
   *
   * These params are optional that are sent in recursively,
   * you typically won't use these:
   *
   * @param (t)       Top corner position number
   * @param (r)       Right corner position number
   * @param (b)       Bottom corner position number
   * @param (l)       Left corner position number
   * @param (w)       Element width number
   * @param (h)       Element height number
   */
  function _isVisible(el, t, r, b, l, w, h) {
    var p = el.parentNode,
        VISIBLE_PADDING = 2;

    if ( !_elementInDocument(el) ) {
      return false;
    }

    //-- Return true for document node
    if ( 9 === p.nodeType ) {
      return true;
    }

    //-- Return false if our element is invisible
    if (
       '0' === _getStyle(el, 'opacity') ||
       'none' === _getStyle(el, 'display') ||
       'hidden' === _getStyle(el, 'visibility')
    ) {
      return false;
    }

    if (
      'undefined' === typeof(t) ||
      'undefined' === typeof(r) ||
      'undefined' === typeof(b) ||
      'undefined' === typeof(l) ||
      'undefined' === typeof(w) ||
      'undefined' === typeof(h)
    ) {
      t = el.offsetTop;
      l = el.offsetLeft;
      b = t + el.offsetHeight;
      r = l + el.offsetWidth;
      w = el.offsetWidth;
      h = el.offsetHeight;
    }
    //-- If we have a parent, let's continue:
    if ( p ) {
      //-- Check if the parent can hide its children.
      if ( ('hidden' === _getStyle(p, 'overflow') || 'scroll' === _getStyle(p, 'overflow')) ) {
        //-- Only check if the offset is different for the parent
        //-- If the target element is to the right of the parent elm
        if (l + VISIBLE_PADDING > p.offsetWidth + p.scrollLeft) {
          //-- Our target element is out of bounds:
          return false;
        }

        //-- If the target element is to the left of the parent elm
        if (l + w - VISIBLE_PADDING < p.scrollLeft) {
          //-- Our target element is out of bounds:
          return false;
        }

        //-- If the target element is under the parent elm
        if (t + VISIBLE_PADDING > p.offsetHeight + p.scrollTop) {
          //-- Our target element is out of bounds:
          return false;
        }

        //-- If the target element is above the parent elm
        if (t + h - VISIBLE_PADDING < p.scrollTop) {
          //-- Our target element is out of bounds:
          return false;
        }
      }
      //-- Add the offset parent's left/top coords to our element's offset:
      if ( el.offsetParent === p ) {
        l += p.offsetLeft;
        t += p.offsetTop;
      }
      //-- Let's recursively check upwards:
      return _isVisible(p, t, r, b, l, w, h);
    }
    return true;
  }

  function _isVisibleJQuery(element) {
    return !!(element.offsetWidth || element.offsetHeight ||
              element.getClientRects().length);
  }

  //-- Cross browser method to get style properties:
  function _getStyle(el, property) {
    if ( window.getComputedStyle ) {
      return document.defaultView.getComputedStyle(el,null)[property];
    }
    if ( el.currentStyle ) {
      return el.currentStyle[property];
    }
  }

  function _elementInDocument(element) {
    while (element = element.parentNode) {
      if (element == document) {
          return true;
      }
    }
    return false;
  }

  if (node instanceof natives.refs.Node.ref && node.nodeName === "#text") {
    return node.parentNode !== null && isVisible(node.parentNode);
  }

  if (node instanceof natives.refs.HTMLScriptElement.ref) {
    return false;
  }

  if (_isVisibleJQuery(node)) {
    return true;
  }

  if (node instanceof natives.refs.HTMLInputElement.ref &&
      node.type === 'checkbox' && node.id.length > 0) {
    for (var i = 0; i < node.labels.length; ++i) {
      if (_isVisibleJQuery(node.labels[i])) {
        return true;
      }
    }
  }

  return false;
};

function looksLikeEventHandlerAttributeAssignment(object, attribute, rhs) {
  return typeof object === 'object' && object !== null &&
         misc.isNative(object) && object !== Window &&
         typeof attribute === 'string' && attribute.indexOf('on') === 0 &&
         attribute.length >= 4 && attribute === attribute.toLowerCase() &&
         attribute !== 'once' && charfunk.isValidName(attribute) &&
         attribute.indexOf('_') < 0 && attribute !== 'onloadframe' &&
         typeof rhs === 'function';
}

function skipEventHandlerRegistration(object, type) {
  debugging.assert(misc.isNative(object));
  if (object instanceof natives.refs.HTMLElement.ref) {
    return type === 'mousemove' || type === 'mouseout' || type === 'mouseover';
  }
  if (object instanceof natives.refs.MessagePort.ref) {
    return type === 'message';
  }
  if (object === document) {
    return type === 'mousemove' || type === 'visibilitychange';
  }
  if (object === window || (typeof object.Window === 'function' &&
                            object instanceof object.Window)) {
    return type === 'beforeunload' || type === 'error' ||
           type === 'hashchange' || type === 'resize' || type === 'scroll';
  }
  return false;
}

module.exports = {
  dfs: dfs,
  getBoundingRect: getBoundingRect,
  getEvent: getEvent,
  getStaticElementId: getStaticElementId,
  getUniqueCssPath: getUniqueCssPath,
  highlightElement: highlightElement,
  isEventHandlerAttribute: isEventHandlerAttribute,
  isNodeAttachedToDocument: isNodeAttachedToDocument,
  isVisible: isVisible,
  looksLikeEventHandlerAttributeAssignment:
    looksLikeEventHandlerAttributeAssignment,
  skipEventHandlerRegistration: skipEventHandlerRegistration
};
