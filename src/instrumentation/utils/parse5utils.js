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

// External
var parse5 = require('parse5');

var treeAdapter = parse5.treeAdapters.default;

function getAttribute(node, name) {
  var attr = node.attrs.find((attr) => attr.name === name);
  if (attr) {
    return attr;
  }
  return null;
}

function getOrMakeAttribute(node, name) {
  var attr = node.attrs.find((attr) => attr.name === name);
  if (attr) {
    return attr;
  }
  attr = { name: name, value: "" };
  node.attrs.push(attr);
  return attr;
}

function insertAfter(node, newNode) {
  var parent = node.parentNode;
  var numChildren = parent.childNodes.length;
  if (parent.childNodes[numChildren - 1] === node) {
    treeAdapter.appendChild(parent, newNode);
  } else {
    var childIndex = parent.childNodes.indexOf(node);
    var sibling = parent.childNodes[childIndex + 1];
    insertBefore(sibling, newNode);
  }
}

function insertBefore(node, newNode) {
  treeAdapter.insertBefore(node.parentNode, newNode, node);
}

function insertScriptAfter(node, code) {
  var newNode = treeAdapter.createElement('script', undefined, [
    { name: 'data-ajaxracer', value: '1' }
  ]);
  treeAdapter.insertText(newNode, code);
  insertAfter(node, newNode);
}

function insertScriptBefore(node, code) {
  var newNode = treeAdapter.createElement('script', undefined, [
    { name: 'data-ajaxracer', value: '1' }
  ]);
  treeAdapter.insertText(newNode, code);
  insertBefore(node, newNode);
}

function prependChild(node, newNode) {
  if (node.childNodes.length) {
    treeAdapter.insertBefore(node, newNode, node.childNodes[0]);
  } else {
    treeAdapter.appendChild(node, newNode);
  }
}

function prependExternalScriptTo(node, src) {
  var newNode = treeAdapter.createElement('script', undefined, [
    { name: 'data-ajaxracer', value: '1' },
    { name: 'src', value: src }
  ]);
  prependChild(node, newNode);
}

function prependScriptTo(node, code) {
  var newNode = treeAdapter.createElement('script', undefined, [
    { name: 'data-ajaxracer', value: '1' }
  ]);
  treeAdapter.insertText(newNode, code);
  prependChild(node, newNode);
}

module.exports = {
  getAttribute: getAttribute,
  getOrMakeAttribute: getOrMakeAttribute,
  insertScriptAfter: insertScriptAfter,
  insertScriptBefore: insertScriptBefore,
  prependExternalScriptTo: prependExternalScriptTo,
  prependScriptTo: prependScriptTo
};
