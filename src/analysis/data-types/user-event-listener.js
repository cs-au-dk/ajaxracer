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

var debugging = require('../../common/debugging.js');
var dom = require('../utils/dom.js');

/**
 * @param {Object} options
 *   An object of the following shape: { useCapture, wrapper }.
 */
function UserEventListener(description, target, type, listener, options) {
  this.description = description;
  this.target = target;
  this.type = type;
  this.listener = listener;
  this.options = options;
  this.event = null;
  this.prerequisites = null;
  this.selector = null;
}

UserEventListener.prototype.forSelector = function (selector) {
  var userEventListener = new UserEventListener(
    this.description, this.target, this.type, this.listener, this.options);
  userEventListener.event = this.event;
  userEventListener.prerequisites = this.prerequisites;
  userEventListener.selector = selector;
  return userEventListener;
};

UserEventListener.prototype.forTarget = function (target) {
  var userEventListener = new UserEventListener(
    this.description, target, this.type, this.listener, this.options);
  userEventListener.event = this.event;
  userEventListener.prerequisites = this.prerequisites;
  userEventListener.selector = this.selector;
  return userEventListener;
};

UserEventListener.prototype.getID = function () {
  // TODO: Include source code of this.listener to help uniquely identify
  // this user event listener.
  var id = {
    selector: this.selector || dom.getUniqueCssPath(this.target),
    staticId: dom.getStaticElementId(this.target),
    type: this.type
  };
  if (this.description) {
    id.description = this.description;
  }
  if (this.prerequisites) {
    debugging.assert(this.prerequisites instanceof Array);
    id.prerequisites = this.prerequisites;
  }
  return id;
};

UserEventListener.prototype.withDescription = function (description) {
  var userEventListener = new UserEventListener(
    description, this.target, this.type, this.listener, this.options);
  userEventListener.event = this.event;
  userEventListener.prerequisites = this.prerequisites;
  userEventListener.selector = this.selector;
  return userEventListener;
};

UserEventListener.prototype.withEvent = function (event) {
  var userEventListener = new UserEventListener(
    this.description, this.target, this.type, this.listener, this.options);
  userEventListener.event = event;
  userEventListener.prerequisites = this.prerequisites;
  userEventListener.selector = this.selector;
  return userEventListener;
};

UserEventListener.prototype.withOptions = function (options) {
  var userEventListener = new UserEventListener(
    this.description, this.target, this.type, this.listener, options);
  userEventListener.event = this.event;
  userEventListener.prerequisites = this.prerequisites;
  userEventListener.selector = this.selector;
  return userEventListener;
};

UserEventListener.prototype.withPrerequisites = function (prerequisites) {
  var userEventListener = new UserEventListener(
    this.description, this.target, this.type, this.listener, this.options);
  userEventListener.event = this.event;
  userEventListener.prerequisites = prerequisites;
  userEventListener.selector = this.selector;
  return userEventListener;
};

module.exports = UserEventListener;
