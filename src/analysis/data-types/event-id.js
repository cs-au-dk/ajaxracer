var util = require('util');

function EventId(registrationId) {
  this.registrationId = registrationId || EventId.nextRegistrationId++;
}

EventId.nextRegistrationId = 1;

EventId.prototype.id = function () {
  return util.format('%s', this.registrationId);
};

EventId.prototype.numericId = function () {
  return this.registrationId;
};

module.exports = EventId;
