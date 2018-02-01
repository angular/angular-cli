const Command = require('../ember-cli/lib/models/command');
import TestTask from '../tasks/test';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';

const config = CliConfig.fromProject() || CliConfig.fromGlobal();
const testConfigDefaults = config.getPaths('defaults.build', [
  'progress', 'poll', 'preserveSymlinks'
]);

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
  forceTsCommonjs?: boolean;
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
      name: 'code-coverage',
      type: Boolean,
      default: false,
      aliases: ['cc'],
      description: 'Coverage report will be in the coverage/ directory.'
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
      description: 'Log progress to the console while in progress.',
      default: typeof testConfigDefaults['progress'] !== 'undefined'
        ? testConfigDefaults['progress']
        : process.stdout.isTTY === true,
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
      name: 'poll',
      type: Number,
      default: testConfigDefaults['poll'],
      description: 'Enable and define the file watching poll time period (milliseconds).'
    },
    {
      name: 'environment',
      type: String,
      aliases: ['e'] ,
      description: 'Defines the build environment.'
    },
    {
      name: 'preserve-symlinks',
      type: Boolean,
      description: 'Do not use the real path when resolving modules.',
      default: testConfigDefaults['preserveSymlinks']
    },
    {
      name: 'app',
      type: String,
      aliases: ['a'],
      description: 'Specifies app name to use.'
    }
  ],

  run: function (commandOptions: TestOptions) {
    const testTask = new TestTask({
      ui: this.ui,
      project: this.project
    });

    if (commandOptions.watch !== undefined && !commandOptions.watch) {
      // if not watching ensure karma is doing a single run
      commandOptions.singleRun = true;
    }

    // Don't force commonjs for code coverage builds, some setups need es2015 for it.
    // https://github.com/angular/angular-cli/issues/5526
    if (!commandOptions.codeCoverage) {
      commandOptions.forceTsCommonjs = true;
    }

    return testTask.run(commandOptions);
  }
});

TestCommand.overrideCore = true;
export default TestCommand;
