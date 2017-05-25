'use strict';

const Command = require('../models/command');
const SilentError = require('silent-error');
const chalk = require('chalk');

module.exports = Command.extend({
  skipHelp: true,
  unknown: true,

  printBasicHelp() {
    return chalk.red(`No help entry for '${this.name}'`);
  },

  validateAndRun() {
    throw new SilentError(`The specified command ${this.name} is invalid. For available options, see \`ng help\`.`);
  },
});
