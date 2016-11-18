'use strict';

var chalk = require('chalk');

module.exports = function(message, test) {
  if (test) {
    console.log(chalk.yellow('DEPRECATION: ' + message));
  }
};

module.exports.deprecateUI = function(ui) {
  return function(message, test) {
    ui.writeDeprecateLine('The deprecateUI utility has been deprecated in favor of ui.writeDeprecateLine');

    test = !test;

    ui.writeDeprecateLine(message, test);
  };
};
