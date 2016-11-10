'use strict';

var InstallCommand = require('./install');

module.exports = InstallCommand.extend({
  name: 'install:addon',
  description: 'This command has been deprecated. Please use `ember install` instead.',
  aliases: [],
  skipHelp: true,

  run: function() {
    var warning = 'This command has been deprecated. Please use `ember ';
    warning += 'install <addonName>` instead.';
    this.ui.writeDeprecateLine(warning);
    return this._super.run.apply(this, arguments);
  }
});
