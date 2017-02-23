/* jshint node: true */
'use strict';

const config = require('../models/config');
const path = require('path');

module.exports = {
  name: 'ng',

  config: function () {
    this.project.ngConfigObj = this.project.ngConfigObj || config.CliConfig.fromProject();
    this.project.ngConfig = this.project.ngConfig || (
        this.project.ngConfigObj && this.project.ngConfigObj.config);
  },

  blueprintsPath: function () {
    return path.join(__dirname, '../blueprints');
  },

  includedCommands: function () {
    return {
      'build': require('../commands/build').default,
      'serve': require('../commands/serve').default,
      'eject': require('../commands/eject').default,
      'new': require('../commands/new').default,
      'generate': require('../commands/generate').default,
      'destroy': require('../commands/destroy').default,
      'test': require('../commands/test').default,
      'e2e': require('../commands/e2e').default,
      'help': require('../commands/help').default,
      'lint': require('../commands/lint').default,
      'version': require('../commands/version').default,
      'completion': require('../commands/completion').default,
      'doc': require('../commands/doc').default,
      'xi18n': require('../commands/xi18n').default,

      // Easter eggs.
      'make-this-awesome': require('../commands/easter-egg').default,

      // Configuration.
      'set': require('../commands/set').default,
      'get': require('../commands/get').default
    };
  }
};
