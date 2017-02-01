const EmberTestCommand = require('../ember-cli/lib/commands/test');

import TestTask from '../tasks/test';
import { CliConfig } from '../models/config';
import { availableOptions } from './test.options';

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
}


const TestCommand = EmberTestCommand.extend({
  availableOptions: availableOptions,

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
