// Internal
var adverseModeExecution = require('./adverse-mode-execution.js');

function SynchronousModeExecution() {
  this.shouldBlockAjaxResponseEvents = false;
}

SynchronousModeExecution.prototype.id = function () {
  return 'oracle-mode-execution';
};

SynchronousModeExecution.prototype.initialize = adverseModeExecution.initialize;

SynchronousModeExecution.prototype.findUserEventListener =
  adverseModeExecution.findUserEventListener;

SynchronousModeExecution.prototype.handlePrerequisites =
  adverseModeExecution.handlePrerequisites;

SynchronousModeExecution.prototype.findPrerequisite =
  adverseModeExecution.findPrerequisite;

SynchronousModeExecution.prototype.run = adverseModeExecution.run;

module.exports = new SynchronousModeExecution();
