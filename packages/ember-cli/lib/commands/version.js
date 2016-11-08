'use strict';

var Command = require('../models/command');
var emberCLIVersion = require('../utilities/version-utils').emberCLIVersion;

module.exports = Command.extend({
  name: 'version',
  description: 'outputs ember-cli version',
  aliases: ['v', '--version', '-v'],
  works: 'everywhere',

  availableOptions: [
    { name: 'verbose', type: Boolean, default: false }
  ],

  run: function(options) {
    this.printVersion('ember-cli', emberCLIVersion());

    var versions = process.versions;
    versions['os'] = process.platform + ' ' + process.arch;

    var alwaysPrint = ['node', 'os'];

    for (var module in versions) {
      if (options.verbose || alwaysPrint.indexOf(module) > -1) {
        this.printVersion(module, versions[module]);
      }
    }
  },

  printVersion: function(module, version) {
    this.ui.writeLine(module + ': ' + version);
  }
});
