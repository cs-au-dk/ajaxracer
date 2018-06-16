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
