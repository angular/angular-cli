import * as Command from 'ember-cli/lib/models/command';
import * as SlientError from 'silent-error';
import * as InstallTask from '../tasks/install';

module.exports = Command.extend({
  name: 'install',
  description: 'Adds 3rd party library to existing project',
  works: 'insideProject',

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
      packages: rawArgs
    });
  }
});

module.exports.overrideCore = true;
