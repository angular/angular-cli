'use strict';

var Promise = require('../ext/promise');
var chalk   = require('chalk');
var exec    = require('child_process').exec;

module.exports = {
  /**
   * Uses the eon-old command NET SESSION to determine whether or not the
   * current user has elevated rights (think sudo, but Windows).
   *
   * @method checkWindowsElevation
   * @param  {Object} ui - ui object used to call writeLine();
   * @return {Object} Object describing whether we're on windows and if admin rights exist
   */
  checkWindowsElevation: function (ui) {
    return new Promise(function (resolve) {
      if (/^win/.test(process.platform)) {
        exec('NET SESSION', function (error, stdout, stderr) {
          var elevated = (!stderr || stderr.length === 0);

          if (!elevated && ui && ui.writeLine) {
            ui.writeLine(chalk.yellow('\nRunning without elevated rights. ' +
              'Running Angular CLI "as Administrator" increases performance significantly.'));
          }

          resolve({
            windows: true,
            elevated: elevated
          });
        });
      } else {
        resolve({
          windows: false,
          elevated: null
        });
      }
    });
  }
};
