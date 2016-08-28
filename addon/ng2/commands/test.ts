const TestCommand = require('ember-cli/lib/commands/test');
import TestTask from '../tasks/test';
import {CliConfig} from '../models/config';

const NgCliTestCommand = TestCommand.extend({
  availableOptions: [
    { name: 'watch', type: Boolean, default: true, aliases: ['w'] },
    { name: 'browsers', type: String },
    { name: 'colors', type: Boolean },
    { name: 'log-level', type: String },
    { name: 'port', type: Number },
    { name: 'reporters', type: String },
    { name: 'build', type: Boolean, default: true }
  ],

  run: function(commandOptions: any) {
    this.project.ngConfig = this.project.ngConfig || CliConfig.fromProject();

    const testTask = new TestTask({
      ui: this.ui,
      analytics: this.analytics,
      project: this.project
    });

    if (!commandOptions.watch) {
      // if not watching ensure karma is doing a single run
      commandOptions.singleRun = true;
    }
    return testTask.run(commandOptions);
  }
});

NgCliTestCommand.overrideCore = true;
export default NgCliTestCommand;
