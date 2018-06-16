// Internal
var debugging = require('../common/debugging.js');

// The arguments that have been passed from the Protractor driver.
var argv;
if (typeof J$.initParams.argv === 'object') {
  argv = J$.initParams.argv;
} else {
  argv = JSON.parse(J$.initParams.argv);
}

debugging.assertEq(typeof argv.config, 'object');
debugging.assertEq(typeof argv.config.maxTimerDuration, 'number');
debugging.assertEq(typeof argv.config.maxTimerChainLength, 'number');
debugging.assertEq(typeof argv.config.waitForPromises, 'boolean');

var mode = {
  ADVERSE: 'adverse',
  SYNCHRONOUS: 'synchronous',
  get: function () {
    debugging.assert(argv.phase === 2);
    return argv.mode;
  }
};

var phase = {
  ONE: 1,
  TWO: 2,
  DEBUGGING: 3,
  get: () => argv.phase
};

debugging.assert(phase.get() === phase.ONE || phase.get() === phase.TWO ||
                 phase.get() === phase.DEBUGGING);

if (phase.get() === 2) {
  debugging.assert(
    mode.get() === mode.ADVERSE || mode.get() === mode.SYNCHRONOUS);
}

module.exports = {
  config: argv.config,
  mode: mode,
  phase: phase,
  pairOfConflictingUserEventListeners: argv.pairOfConflictingUserEventListeners
};
