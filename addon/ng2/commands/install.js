'use strict';

var Command         = require('ember-cli/lib/models/command');
var SilentError     = require('silent-error');
var Promise         = require('ember-cli/lib/ext/promise');
var LibInstallTask  = require('../tasks/lib-install');

module.exports = Command.extend({
  name: 'install',
  description: 'Adds 3rd party libraries to existing project',
  works: 'insideProject',
  availableOptions: [
    { name: 'skip-injection', type: Boolean, default: false, aliases: ['s'] },
    { name: 'auto-injection', type: Boolean, default: false, aliases: ['ai'] },
  ],
  run: function (commandOptions, rawArgs) {
    if (!rawArgs.length) {
      var msg = 'The `ng install` command must take an argument with ' +
        'at least one package name.';

      return Promise.reject(new SilentError(msg));
    }

    var libInstallTask = new LibInstallTask({
      ui:         this.ui,
      analytics:  this.analytics,
      project:    this.project
    });

    return libInstallTask.run({
      packages: rawArgs,
      skipInjection: commandOptions.skipInjection,
      autoInjection: commandOptions.autoInjection
    });
  }
});

module.exports.overrideCore = true;
