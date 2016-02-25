'use strict';

var Command = require('ember-cli/lib/models/command');
var path    = require('path');

module.exports = Command.extend({
  name: 'version',
  description: 'outputs angular-cli version',
  aliases: ['v', '--version', '-v'],
  works: 'everywhere',

  availableOptions: [
    { name: 'verbose', type: Boolean, default: false }
  ],

  run: function(options) {
    var versions = process.versions;
    var pkg = require(path.resolve(__dirname, '..', '..', '..', 'package.json'));

    versions['os'] = process.platform + ' ' + process.arch;

    var alwaysPrint = ['node', 'os'];

    this.printVersion('angular-cli', pkg.version);

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

module.exports.overrideCore = true;
