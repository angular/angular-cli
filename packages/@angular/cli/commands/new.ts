import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import denodeify = require('denodeify');

import InitCommand from './init';
import { CliConfig } from '../models/config';
import { validateProjectName } from '../utilities/validate-project-name';
import { oneLine } from 'common-tags';

const Command = require('../ember-cli/lib/models/command');
const Project = require('../ember-cli/lib/models/project');
const SilentError = require('silent-error');

// There's some problem with the generic typings for fs.makedir.
// Couldn't find matching types for the callbacks so leaving it as any for now.
const mkdir = denodeify<string, void>(fs.mkdir as any);

const configFile = '.angular-cli.json';
const changeLater = (path: string) => `You can later change the value in "${configFile}" (${path})`;

const NewCommand = Command.extend({
  name: 'new',
  aliases: ['n'],
  description: `Creates a new directory and a new Angular app eg. "ng new [name]".`,
  works: 'outsideProject',

  availableOptions: [
    {
      name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: oneLine`
        Run through without making any changes.
        Will list all files that would have been created when running "ng new".
      `
    },
    {
      name: 'verbose',
      type: Boolean,
      default: false,
      aliases: ['v'],
      description: 'Adds more details to output logging.'
    },
    {
      name: 'link-cli',
      type: Boolean,
      default: false,
      aliases: ['lc'],
      description: 'Automatically link the `@angular/cli` package.',
      hidden: true
    },
    {
      name: 'skip-install',
      type: Boolean,
      default: false,
      aliases: ['si'],
      description: 'Skip installing packages.'
    },
    {
      name: 'skip-git',
      type: Boolean,
      default: false,
      aliases: ['sg'],
      description: 'Skip initializing a git repository.'
    },
    {
      name: 'skip-tests',
      type: Boolean,
      default: false,
      aliases: ['st'],
      description: 'Skip creating spec files.'
    },
    {
      name: 'skip-commit',
      type: Boolean,
      default: false,
      aliases: ['sc'],
      description: 'Skip committing the first commit to git.'
    },
    {
      name: 'directory',
      type: String,
      aliases: ['dir'],
      description: 'The directory name to create the app in.'
    },
    {
      name: 'source-dir',
      type: String,
      default: 'src',
      aliases: ['sd'],
      description: `The name of the source directory. ${changeLater('apps[0].root')}.`
    },
    {
      name: 'style',
      type: String,
      default: 'css',
      description: oneLine`The style file default extension.
        Possible values: css, scss, less, sass, styl(stylus).
        ${changeLater('defaults.styleExt')}.
      `
    },
    {
      name: 'prefix',
      type: String,
      default: 'app',
      aliases: ['p'],
      description: oneLine`
        The prefix to use for all component selectors.
        ${changeLater('apps[0].prefix')}.
      `
    },
    {
      name: 'routing',
      type: Boolean,
      default: false,
      description: 'Generate a routing module.'
    },
    {
      name: 'inline-style',
      type: Boolean,
      default: false,
      aliases: ['is'],
      description: 'Should have an inline style.'
    },
    {
      name: 'inline-template',
      type: Boolean,
      default: false,
      aliases: ['it'],
      description: 'Should have an inline template.'
     },
     {
      name: 'minimal',
      type: Boolean,
      default: false,
      description: 'Should create a minimal app.'
     }
  ],

  isProject: function (projectPath: string) {
    return CliConfig.fromProject(projectPath) !== null;
  },

  run: function (commandOptions: any, rawArgs: string[]) {
    const packageName = rawArgs.shift();

    if (!packageName) {
      return Promise.reject(new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified eg. ` +
        chalk.yellow('ng new [name] ') +
        `For more details, use "ng help".`));
    }

    validateProjectName(packageName);
    commandOptions.name = packageName;
    if (commandOptions.dryRun) {
      commandOptions.skipGit = true;
    }

    const directoryName = path.join(process.cwd(),
      commandOptions.directory ? commandOptions.directory : packageName);

    const initCommand = new InitCommand({
      ui: this.ui,
      tasks: this.tasks,
      project: Project.nullProject(this.ui, this.cli)
    });

    let createDirectory;
    if (commandOptions.dryRun) {
      createDirectory = Promise.resolve()
        .then(() => {
          if (fs.existsSync(directoryName) && this.isProject(directoryName)) {
            throw new SilentError(oneLine`
              Directory ${directoryName} exists and is already an Angular CLI project.
            `);
          }
        });
    } else {
      createDirectory = mkdir(directoryName)
        .catch((err) => {
          if (err.code === 'EEXIST') {
            if (this.isProject(directoryName)) {
              throw new SilentError(oneLine`
                Directory ${directoryName} exists and is already an Angular CLI project.
              `);
            }
          } else {
            throw err;
          }
        })
        .then(() => process.chdir(directoryName));
    }

    return createDirectory
      .then(initCommand.run.bind(initCommand, commandOptions, rawArgs));
  }
});


NewCommand.overrideCore = true;
export default NewCommand;
