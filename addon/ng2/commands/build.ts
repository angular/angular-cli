import * as Command from 'ember-cli/lib/models/command';
import * as win from 'ember-cli/lib/utilities/windows-admin';
import * as Build from '../tasks/build';
import * as BuildWatch from '../tasks/build-watch';

module.exports = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: [
    { name: 'environment',    type: String,  default: 'development', aliases: ['e', { 'dev': 'development' }, { 'prod': 'production' }] },
    { name: 'output-path',    type: 'Path',  default: 'dist/',       aliases: ['o'] },
    { name: 'watch',          type: Boolean, default: false,         aliases: ['w'] },
    { name: 'watcher',        type: String },
    { name: 'suppress-sizes', type: Boolean, default: false }
  ],

  run: function(commandOptions) {
    const BuildTask = this.taskFor(commandOptions);
    const buildTask = new BuildTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    return win.checkWindowsElevation(this.ui).then(function () {
      return buildTask.run(commandOptions);
    });
  },

  taskFor: function(options) {
    if (options.watch) {
      return BuildWatch;
    } else {
      return Build;
    }
  }
});

module.exports.overrideCore = true;
