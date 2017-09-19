const Command = require('../ember-cli/lib/models/command');
import TestTask from '../tasks/test';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';

const config = CliConfig.fromProject() || CliConfig.fromGlobal();
const testConfigDefaults = config.getPaths('defaults.build', [
  'progress', 'poll'
]);

export interface TestOptions {
  watch?: boolean;
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
  app?: string;
}


const TestCommand = Command.extend({
  name: 'test',
  aliases: ['t'],
  description: 'Run unit tests in existing project.',
  works: 'insideProject',

  availableOptions: [
    {
      name: 'watch',
      type: Boolean,
      aliases: ['w'],
      description: 'Run build when files change.'
    },
    {
      name: 'config',
      type: String,
      aliases: ['c'],
      description: oneLine`Use a specific config file.
        Defaults to the karma config file in .angular-cli.json.`
    },
    {
      name: 'single-run',
      type: Boolean,
      aliases: ['sr'],
      description: 'Run tests a single time.'
    },
    {
      name: 'progress',
      type: Boolean,
      default: testConfigDefaults['progress'],
      description: 'Log progress to the console while in progress.'
    },
    {
      name: 'browsers',
      type: String,
      description: 'Override which browsers tests are run against.'
    },
    {
      name: 'colors',
      type: Boolean,
      description: 'Enable or disable colors in the output (reporters and logs).'
    },
    {
      name: 'log-level',
      type: String,
      description: 'Level of logging.'
    },
    {
      name: 'port',
      type: Number,
      description: 'Port where the web server will be listening.'
    },
    {
      name: 'reporters',
      type: String,
      description: 'List of reporters to use.'
    },
    {
      name: 'sourcemaps',
      type: Boolean,
      default: true,
      aliases: ['sm', 'sourcemap'],
      description: 'Output sourcemaps.'
    },
    {
      name: 'app',
      type: String,
      aliases: ['a', 'lib'],
      description: 'Specifies app name to use.'
    }
  ],

  run: function (commandOptions: TestOptions, rawArgs: string[]) {
    const app = (rawArgs.length > 0 && !rawArgs[0].startsWith('-')) ?
      rawArgs[0] : commandOptions.app;

    const testTask = new TestTask({
      ui: this.ui,
      project: this.project,
      app
    });

    if (commandOptions.watch !== undefined && !commandOptions.watch) {
      // if not watching ensure karma is doing a single run
      commandOptions.singleRun = true;
    }
    return testTask.run(commandOptions);
  }
});

TestCommand.overrideCore = true;
export default TestCommand;
