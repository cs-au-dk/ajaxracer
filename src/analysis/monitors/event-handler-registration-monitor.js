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
var EmptyMonitor = require('../monitors/empty-monitor.js');
var List = require('../stdlib/list.js');
var natives = require('../utils/natives.js');
var UserEventListener = require('../data-types/user-event-listener.js');

function EventHandlerRegistrationMonitor() {
  this.registeredUserEventListeners = new List();
}

EventHandlerRegistrationMonitor.prototype =
  Object.create(EmptyMonitor.prototype);

EventHandlerRegistrationMonitor.prototype.id = function () {
  return 'event-handler-registration-monitor';
};

EventHandlerRegistrationMonitor.prototype.onRegisterEventListener =
    function (target, type, listener, options) {
  if (type === 'click' || type === 'focus' || type === 'keydown' ||
      type === 'keypress' || type === 'keyup' || type === 'mousedown' ||
      type === 'mouseup') {
    this.registeredUserEventListeners.push(
      new UserEventListener(null, target, type, listener, options));
  }

  if (type === 'change' &&
      (target instanceof natives.refs.HTMLInputElement.ref ||
       target instanceof natives.refs.HTMLSelectElement.ref)) {
    this.registeredUserEventListeners.push(
      new UserEventListener(null, target, type, listener, options));
  }
};

module.exports = new EventHandlerRegistrationMonitor();
