import * as fs from 'fs';
import * as path from 'path';
import denodeify = require('denodeify');

import InitCommand from './init';
import { CliConfig } from '../models/config';
import { validateProjectName } from '../utilities/validate-project-name';
import { oneLine } from 'common-tags';

const Command = require('../ember-cli/lib/models/command');
const Project = require('../ember-cli/lib/models/project');
const SilentError = require('silent-error');
const mkdir = denodeify(fs.mkdir);


const NewCommand = Command.extend({
  name: 'new',
  description: `Creates a new directory and a new Angular app.`,
  works: 'outsideProject',

  availableOptions: [
    { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
    { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
    { name: 'link-cli', type: Boolean, default: false, aliases: ['lc'] },
    { name: 'ng4', type: Boolean, default: false },
    { name: 'skip-install', type: Boolean, default: false, aliases: ['si'] },
    { name: 'skip-git', type: Boolean, default: false, aliases: ['sg'] },
    { name: 'skip-tests', type: Boolean, default: false, aliases: ['st'] },
    { name: 'skip-commit', type: Boolean, default: false, aliases: ['sc'] },
    { name: 'directory', type: String, aliases: ['dir'] },
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'style', type: String, default: 'css' },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'routing', type: Boolean, default: false },
    { name: 'inline-style', type: Boolean, default: false, aliases: ['is'] },
    { name: 'inline-template', type: Boolean, default: false, aliases: ['it'] }
  ],

  isProject: function (projectPath: string) {
    return CliConfig.fromProject(projectPath) !== null;
  },

  run: function (commandOptions: any, rawArgs: string[]) {
    const packageName = rawArgs.shift();

    if (!packageName) {
      return Promise.reject(new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified. ` +
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
        .catch(err => {
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
