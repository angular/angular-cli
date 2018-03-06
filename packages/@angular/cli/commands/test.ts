const Command = require('../ember-cli/lib/models/command');
import TestTask from '../tasks/test';


export interface TestOptions {
  watch?: boolean;
  codeCoverage?: boolean;
  singleRun?: boolean;
  browsers?: string;
  colors?: boolean;
  log?: string;
  port?: number;
  reporters?: string;
  sourcemaps?: boolean;
  progress?: boolean;
  config: string;
  poll?: number;
  environment?: string;
  app?: string;
  preserveSymlinks?: boolean;
}


const TestCommand = Command.extend({
  name: 'test',
  aliases: ['t'],
  description: 'Run unit tests in existing project.',
  works: 'insideProject',

  availableOptions: [],

  run: function (commandOptions: TestOptions) {
    const testTask = new TestTask({
      ui: this.ui,
      project: this.project
    });

    return testTask.run(commandOptions);
  }
});

TestCommand.overrideCore = true;
export default TestCommand;
