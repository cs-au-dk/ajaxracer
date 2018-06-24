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
var instrumentJavaScript = require('./instrument-js.js');
var miniJalangi = require('./mini-jalangi.js');
var parse5utils = require('./utils/parse5utils.js');

// External
var fs = require('fs');
var path = require('path');
var proxy = require('rewriting-proxy');
var util = require('util');

var locationInfo = false;
var nextId = 1;
var nextAjaxRacerId = 1;
var root = path.join(__dirname, '../..');

function getOrMakeElementId(node) {
  var attr = parse5utils.getOrMakeAttribute(node, 'id');
  if (typeof attr.value === 'string' && attr.value.trim().length > 0) {
    return attr.value;
  }
  return attr.value = util.format('fake-id-%s', nextId++);
}

function setAjaxRacerId(node) {
  var attr = parse5utils.getOrMakeAttribute(node, 'data-ajax-racer-id');
  attr.value = util.format('static-element-%s', nextAjaxRacerId++);
}

function beforeVisitor(node, inlineScriptRewriter) {
  return node;
}

function visitor(node, inlineScriptRewriter, argv, url) {
  if (typeof node === 'object') {
    if (typeof node.tagName === 'string') {
      setAjaxRacerId(node);

      var tagName = node.tagName.toLowerCase();
      switch (tagName) {
        case 'html':
          // Remove `manifest` attribute, if any.
          for (var i = node.attrs.length - 1; i >= 0; --i) {
            var name = node.attrs[i].name.toLowerCase();
            if (name === 'manifest') {
              node.attrs.splice(i, 1);
            }
          }
          break;

        case 'head':
          if (url.indexOf('http://') === 0) {
            parse5utils.prependExternalScriptTo(
              node, "http://localhost:8080/out/analysis.js");
          } else {
            parse5utils.prependScriptTo(
              node, fs.readFileSync(path.join(root, 'out/analysis.js')));
          }
          parse5utils.prependScriptTo(node, util.format(
            'window.J$ = window.J$ || { initParams: { argv: %s } };', argv));
          break;

        case 'iframe':
          var srcAttr = parse5utils.getAttribute(node, 'src');
          if (srcAttr !== null) {
            var newSrc = 'https://www.google.com/blank.html';
            parse5utils.insertScriptBefore(
              node,
              util.format(
                'console.warn(%s); ' +
                  'J$.analysis.removeInjectedScripts();',
                JSON.stringify(util.format("Changing iframe URL from %s to %s",
                                           srcAttr.value, newSrc))));
            srcAttr.value = newSrc;
          }
          break;

        case 'script':
          // Always create an ID for script tags.
          // This is required by the `scriptEnter` hook.
          var scriptId = getOrMakeElementId(node);

          // Remove `integrity` attribute, if any.
          for (var i = node.attrs.length - 1; i >= 0; --i) {
            var name = node.attrs[i].name.toLowerCase();
            if (name === 'integrity') {
              node.attrs.splice(i, 1);
            }
          }

          // If it is an asynchronous script, then insert a synthetic script
          // after the current one that wraps the `onload` event handler,
          // if any.
          if (node.attrs.some((attr) => attr.name === 'async')) {
            parse5utils.insertScriptAfter(
              node,
              util.format('J$.analysis.onElementDeclaration(%s);',
                          JSON.stringify(scriptId)));
          }
          break;
      }

      // Insert a script inside the current element, which wraps event handler
      // registrations.
      if (node.attrs.some((attr) => attr.name === 'onclick' ||
                                    attr.name === 'onkeydown' ||
                                    attr.name === 'onkeypress' ||
                                    attr.name === 'onkeyup' ||
                                    attr.name === 'onmousedown' ||
                                    attr.name === 'onmouseup')) {
        var code = util.format('J$.analysis.onElementDeclaration(%s);',
                               JSON.stringify(getOrMakeElementId(node)));
        if (tagName === 'input') {
          parse5utils.insertScriptAfter(node, code);
        } else {
          parse5utils.prependScriptTo(node, code);
        }
      }
    }
  }
}

function rewrite(html, options) {
  var inlineScriptRewriter = function (code, metadata) {
    try {
      var isInlineScript = metadata.type !== 'event-handler' &&
                           metadata.type !== 'javascript-url';
      return instrumentJavaScript(code, {
        allowReturnOutsideFunction: !isInlineScript,
        isInlineScript: isInlineScript,
        isExternalScript: false,
        url: metadata.url // e.g., http://foo.com/#inline-1
      });
    } catch (e) {
      // Do not crash in case of syntax errors
    }
    return code;
  };
  return proxy.rewriteHTML(
    html, options.url, inlineScriptRewriter, null, null, {
      onNodeVisited:
        (node) => visitor(node, inlineScriptRewriter, options.argv, options.url),
      locationInfo: locationInfo
    });
}

module.exports = {
  beforeVisitor: beforeVisitor,
  locationInfo: locationInfo,
  rewrite: rewrite,
  visitor: visitor
};
