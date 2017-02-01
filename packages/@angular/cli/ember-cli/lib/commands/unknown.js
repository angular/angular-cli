'use strict';

var Command     = require('../models/command');
var SilentError = require('silent-error');
var chalk       = require('chalk');

module.exports = Command.extend({
  skipHelp: true,
  unknown: true,

  printBasicHelp: function() {
    return chalk.red('No help entry for \'' + this.name + '\'');
  },

  validateAndRun: function() {
    throw new SilentError('The specified command ' + this.name +
                          ' is invalid. For available options, see' +
                          ' `ng help`.');
  }
});
