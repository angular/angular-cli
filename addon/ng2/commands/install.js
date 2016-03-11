/* jshint node: true, esnext: true */
'use strict';

const Command      = require('ember-cli/lib/models/command');
const SilentError  = require('silent-error');
const Promise      = require('ember-cli/lib/ext/promise');
const InstallTask  = require('../tasks/install');

module.exports = Command.extend({
  name: 'install',
  description: 'Adds 3rd party library to existing project',
  works: 'insideProject',

  availableOptions: [
    { name: 'typings', type: String, aliases: ['t'], description: 'Installs specified typings' }
  ],

  run: function (commandOptions, rawArgs) {
    if (!rawArgs.length) {
      const msg = 'The `ng install` command must take an argument with ' +
                  'a package name.';

      return Promise.reject(new SilentError(msg));
    }

    const installTask = new InstallTask({
      ui:         this.ui,
      analytics:  this.analytics,
      project:    this.project
    });

    return installTask.run({
      packages: rawArgs,
      typings: commandOptions.typings || null
    });
  }
});

module.exports.overrideCore = true;
