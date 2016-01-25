'use strict';

var GenerateCommand = require('ember-cli/lib/commands/generate');

module.exports = GenerateCommand.extend({
  availableOptions: [
    { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
    { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
    { name: 'blueprint', type: String, default: 'ng2', aliases: ['b'] },
    { name: 'name', type: String, default: '', aliases: ['n'] },
    { name: 'style', type: String, default: 'css', aliases: ['s'] }
  ],

  _defaultBlueprint: function() {
    if (this.project.isEmberCLIAddon()) {
      return 'addon';
    } else {
      return 'ng2';
    }
  },
});

module.exports.overrideCore = true;
