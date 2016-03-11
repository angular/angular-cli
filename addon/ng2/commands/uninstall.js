/* jshint node: true, esnext: true */
'use strict';

const Command       = require('ember-cli/lib/models/command');
const SilentError   = require('silent-error');
const Promise       = require('ember-cli/lib/ext/promise');
const UninstallTask = require('../tasks/uninstall');

module.exports = Command.extend({
  name: 'uninstall',
  description: 'Removes 3rd party library from existing project',
  works: 'insideProject',

  availableOptions: [
    { name: 'typings', type: String, aliases: ['t'], description: 'Removes specified typings' }
  ],

  run: function (commandOptions, rawArgs) {
    if (!rawArgs.length) {
      const msg = 'The `ng uninstall` command must take an argument with ' +
                  'a package name.';

      return Promise.reject(new SilentError(msg));
    }

    const uninstallTask = new UninstallTask({
      ui:         this.ui,
      analytics:  this.analytics,
      project:    this.project
    });

    return uninstallTask.run({
      packages: rawArgs,
      typings: commandOptions.typings || null
    });
  }
});

module.exports.overrideCore = true;
