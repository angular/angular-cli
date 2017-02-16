const EmberTestCommand = require('../ember-cli/lib/commands/test');
import TestTask from '../tasks/test';
import {CliConfig} from '../models/config';

const config = CliConfig.fromProject() || CliConfig.fromGlobal();
const pollDefault = config.config.defaults && config.config.defaults.poll;

export interface TestOptions {
  watch?: boolean;
  codeCoverage?: boolean;
  singleRun?: boolean;
  browsers?: string;
  colors?: boolean;
  log?: string;
  port?: number;
  reporters?: string;
  build?: boolean;
  sourcemap?: boolean;
  progress?: boolean;
  config: string;
  poll?: number;
}


const TestCommand = EmberTestCommand.extend({
  availableOptions: [
    { name: 'watch', type: Boolean, default: true, aliases: ['w'] },
    { name: 'code-coverage', type: Boolean, default: false, aliases: ['cc'] },
    { name: 'config', type: String, aliases: ['c'] },
    { name: 'single-run', type: Boolean, default: false, aliases: ['sr'] },
    { name: 'progress', type: Boolean, default: true},
    { name: 'browsers', type: String },
    { name: 'colors', type: Boolean },
    { name: 'log-level', type: String },
    { name: 'port', type: Number },
    { name: 'reporters', type: String },
    { name: 'build', type: Boolean, default: true },
    { name: 'sourcemap', type: Boolean, default: true, aliases: ['sm'] },
    {
      name: 'poll',
      type: Number,
      default: pollDefault,
      description: 'enable and define the file watching poll time period (milliseconds)'
    }
  ],

  run: function(commandOptions: TestOptions) {
    this.project.ngConfig = this.project.ngConfig || CliConfig.fromProject();

    const testTask = new TestTask({
      ui: this.ui,
      project: this.project
    });

    if (!commandOptions.watch) {
      // if not watching ensure karma is doing a single run
      commandOptions.singleRun = true;
    }
    return testTask.run(commandOptions);
  }
});

TestCommand.overrideCore = true;
export default TestCommand;
