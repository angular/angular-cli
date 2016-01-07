'use strict';

var Command           = require('ember-cli/lib/models/command');
var SilentError       = require('silent-error');
var Promise           = require('ember-cli/lib/ext/promise');
var LibUninstallTask  = require('../tasks/lib-uninstall');

module.exports = Command.extend({
  name: 'uninstall',
  description: 'Removes 3rd party libraries from existing project',
  works: 'insideProject',
  availableOptions: [
    { name: 'auto-remove', type: Boolean, default: false, aliases: ['ar'] }
  ],
  run: function (commandOptions, rawArgs) {
    if (!rawArgs.length) {
      var msg = 'The `ng uninstall` command must take an argument with ' +
        'at least one package name.';

      return Promise.reject(new SilentError(msg));
    }

    var libUninstallTask = new LibUninstallTask({
      ui:         this.ui,
      analytics:  this.analytics,
      project:    this.project
    });

    return libUninstallTask.run({
      packages: rawArgs,
      autoRemove: commandOptions.autoRemove
    });
  }
});
