import * as Command from 'ember-cli/lib/models/command';
import * as SilentError from 'silent-error';
import * as UninstallTask from '../tasks/uninstall';

module.exports = Command.extend({
  name: 'uninstall',
  description: 'Removes 3rd party library from existing project',
  works: 'insideProject',

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
      packages: rawArgs
    });
  }
});

module.exports.overrideCore = true;
