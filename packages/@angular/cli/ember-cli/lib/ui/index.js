'use strict';

var EOL              = require('os').EOL;
var chalk            = require('chalk');
var writeError       = require('./write-error');

var DEFAULT_WRITE_LEVEL = 'INFO';

// Note: You should use `ui.outputStream`, `ui.inputStream` and `ui.write()`
//       instead of `process.stdout` and `console.log`.
//       Thus the pleasant progress indicator automatically gets
//       interrupted and doesn't mess up the output! -> Convenience :P

module.exports = UI;

/*
  @constructor

  The UI provides the CLI with a unified mechanism for providing output and
  requesting input from the user. This becomes useful when wanting to adjust
  logLevels, or mock input/output for tests.

  new UI({
    inputStream: process.stdin,
    outputStream: process.stdout,
    writeLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR',
    ci: true | false
  });

**/

function UI(options) {
  // Output stream
  this.outputStream = options.outputStream;
  this.inputStream = options.inputStream;
  this.errorStream = options.errorStream;

  this.errorLog = options.errorLog || [];
  this.writeLevel = options.writeLevel || DEFAULT_WRITE_LEVEL;
  this.ci = !!options.ci;
}

/**
  Unified mechanism to write a string to the console.
  Optionally include a writeLevel, this is used to decide if the specific
  logging mechanism should or should not be printed.

  @method write
  @param {String} data
  @param {Number} writeLevel
*/
UI.prototype.write = function(data, writeLevel) {
  if (writeLevel === 'ERROR') {
    this.errorStream.write(data);
  } else if (this.writeLevelVisible(writeLevel)) {
    this.outputStream.write(data);
  }
};

/**
  Unified mechanism to write a string and new line to the console.
  Optionally include a writeLevel, this is used to decide if the specific
  logging mechanism should or should not be printed.
  @method writeLine
  @param {String} data
  @param {Number} writeLevel
*/
UI.prototype.writeLine = function(data, writeLevel) {
  this.write(data + EOL, writeLevel);
};

/**
  Helper method to write a string with the DEBUG writeLevel and gray chalk
  @method writeDebugLine
  @param {String} data
*/
UI.prototype.writeDebugLine = function(data) {
  this.writeLine(chalk.gray(data), 'DEBUG');
};

/**
  Helper method to write a string with the INFO writeLevel and cyan chalk
  @method writeInfoLine
  @param {String} data
*/
UI.prototype.writeInfoLine = function(data) {
  this.writeLine(chalk.cyan(data), 'INFO');
};

/**
  Helper method to write a string with the WARNING writeLevel and yellow chalk.
  Optionally include a test. If falsy, the warning will be printed. By default, warnings
  will be prepended with WARNING text when printed.
  @method writeWarnLine
  @param {String} data
  @param {Boolean} test
  @param {Boolean} prepend
*/
UI.prototype.writeWarnLine = function(data, test, prepend) {
  if (test) { return; }

  data = this.prependLine('WARNING', data, prepend);
  this.writeLine(chalk.yellow(data), 'WARNING', test);
};

/**
  Helper method to write a string with the WARNING writeLevel and yellow chalk.
  Optionally include a test. If falsy, the deprecation will be printed. By default deprecations
  will be prepended with DEPRECATION text when printed.
  @method writeDeprecateLine
  @param {String} data
  @param {Boolean} test
  @param {Boolean} prepend
*/
UI.prototype.writeDeprecateLine = function(data, test, prepend) {
  data = this.prependLine('DEPRECATION', data, prepend);
  this.writeWarnLine(data, test, false);
};

/**
  Utility method to prepend a line with a flag-like string (i.e., WARNING).
  @method prependLine
  @param {String} prependData
  @param {String} data
  @param {Boolean} prepend
*/
UI.prototype.prependLine = function(prependData, data, prepend) {
  if (typeof prepend === 'undefined' || prepend) {
    data = prependData + ': ' + data;
  }

  return data;
};

/**
  Unified mechanism to an Error to the console.
  This will occure at a writeLevel of ERROR

  @method writeError
  @param {Error} error
*/
UI.prototype.writeError = function(error) {
  writeError(this, error);
};

/**
  Sets the write level for the UI. Valid write levels are 'DEBUG', 'INFO',
  'WARNING', and 'ERROR'.

  @method setWriteLevel
  @param {String} level
*/
UI.prototype.setWriteLevel = function(level) {
  if (Object.keys(this.WRITE_LEVELS).indexOf(level) === -1) {
    throw new Error('Unknown write level. Valid values are \'DEBUG\', \'INFO\', \'WARNING\', and \'ERROR\'.');
  }

  this.writeLevel = level;
};

UI.prototype.startProgress = function(message/*, stepString*/) {
  if (this.writeLevelVisible('INFO')) {
    this.writeLine(message);
  }
};

UI.prototype.stopProgress = function() {

};

UI.prototype.prompt = function(questions, callback) {
  var inquirer = require('inquirer');

  // If no callback was provided, automatically return a promise
  if (callback) {
    return inquirer.prompt(questions, callback);
  }

  return inquirer.prompt(questions);
};

/**
  @property WRITE_LEVELS
  @private
  @type Object
*/
UI.prototype.WRITE_LEVELS = {
  'DEBUG': 1,
  'INFO': 2,
  'WARNING': 3,
  'ERROR': 4
};

/**
  Whether or not the specified write level should be printed by this UI.

  @method writeLevelVisible
  @private
  @param {String} writeLevel
  @return {Boolean}
*/
UI.prototype.writeLevelVisible = function(writeLevel) {
  var levels = this.WRITE_LEVELS;
  writeLevel = writeLevel || DEFAULT_WRITE_LEVEL;

  return levels[writeLevel] >= levels[this.writeLevel];
};
