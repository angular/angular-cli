/// <reference path="../../../typings/index.d.ts" />

import * as chalk from 'chalk';
import * as Command from 'ember-cli/lib/models/command';
import * as Project from 'ember-cli/lib/models/project';
import * as SilentError from 'silent-error';
import * as validProjectName from 'ember-cli/lib/utilities/valid-project-name';
import * as GenerateCommand from './generate';
import {NgAppStructure} from '../models/newFromJSON.model';

const normalizeBlueprint = require('ember-cli/lib/utilities/normalize-blueprint-option');
const fs = require('fs');
const exec = require('child_process').execSync;
const async = require('async');
const NewCommand = require('./new');
const InitCommand = require('./init');

const projectJSON: NgAppStructure = <NgAppStructure>JSON.parse(fs.readFileSync('ng-project.json', 'utf8'));
let generatedItemCount: number = 0;

const NewFromJSONCommand = Command.extend({
  name: 'newfromjson',
  works: 'outsideProject',

  availableOptions: [
    { name: 'dry-run', type: Boolean, default: false, aliases: ['d'] },
    { name: 'verbose', type: Boolean, default: false, aliases: ['v'] },
    { name: 'blueprint', type: String, default: 'ng2', aliases: ['b'] },
    { name: 'link-cli', type: Boolean, default: false, aliases: ['lc'] },
    { name: 'skip-npm', type: Boolean, default: false, aliases: ['sn'] },
    { name: 'skip-bower', type: Boolean, default: true, aliases: ['sb'] },
    { name: 'skip-git', type: Boolean, default: false, aliases: ['sg'] },
    { name: 'directory', type: String, aliases: ['dir'] },
    { name: 'source-dir', type: String, default: 'src', aliases: ['sd'] },
    { name: 'style', type: String, default: 'css' },
    { name: 'prefix', type: String, default: 'app', aliases: ['p'] },
    { name: 'mobile', type: Boolean, default: false }
  ],

  run: function (commandOptions, rawArgs) {

    if (!projectJSON) {
      return Promise.reject(new SilentError(
        `The "ng ${this.name}" command requires a ng-project.json file. ` +
        `For more details, use "ng help".`));
    }

    this.ui.writeLine(chalk.cyan(`The raw arguments are ${rawArgs}`));

    const packageName = projectJSON.package.name;
    const packageOptions = {
      'blueprint': projectJSON.package.blueprint || commandOptions.blueprint || undefined,
      'dryRun': projectJSON.package.dryRun || commandOptions.dryRun,
      'directory': projectJSON.package.directory || commandOptions.directory || undefined,
      'verbose': projectJSON.package.verbose || commandOptions.verbose,
      'skipNpm': projectJSON.package.skipNpm || commandOptions.skipNpm,
      'skipGit': projectJSON.package.skipGit || commandOptions.skipGit
    }
    const commandAliases = {
      'classes': 'cl',
      'components': 'c',
      'directives': 'd',
      'enums': 'e',
      'pipes': 'p',
      'routes': 'r',
      'services': 's'
    };
    const createAndStepIntoDirectory =
      new this.tasks.CreateAndStepIntoDirectory({ ui: this.ui, analytics: this.analytics });

    let executeCommand = (
      data: {
        command: string,
        options?: {}
      }) => {
      let child = exec(data.command, data.options);
    };

    let generatePackage = (options: {}) => {
      let commandstring = `ng new ${options.name}`;
      if (options.dryRun) {
        commandstring += ' --dry-run';
      }
      if (options.verbose) {
        commandstring += ' --verbose';
      }
      if (options.skipNpm) {
        commandstring += ' --skip-npm';
      }
      if (options.skipGit) {
        commandstring += ' --skip-git';
      }
      if (options.directory) {
        commandstring += ` --directory=${options.directory}`;
      }
      if (options.blueprint) {
        commandstring += ` --blueprint=${options.blueprint}`;
      }
      let packageGenerator = executeCommand({
        command: commandstring,
        options: {
          cwd: process.cwd(),
          maxBuffer: 2000 * 1024,
          stdio: [0, 1, 2]
        }
      })
    }

    let generateItems = (
      data: {
        projectJSONProperty: string[],
        directoryName: string
      }) => {

      this.ui.writeLine(chalk.red(`The current directory is ${process.cwd()}`));
      data.projectJSONProperty.forEach((item: {}, index: number) => {
        this.ui.writeLine(chalk.green(`The ${data.directoryName} name is ${item.name}`));
        let commandstring = `ng generate ${commandAliases[data.directoryName]} /${data.directoryName}/${item.name}`;
        if (item.flat) {
          commandstring += ' --flat';
        }
        if (item.default) {
          commandstring += ' --default';
        }
        if (item.skipRouterGeneration) {
          commandstring += ' --skip-router-generation';
        }
        if (item.lazy === false) {
          commandstring += ' --lazy=false';
        }
        if (item.route) {
          commandstring += ` --route=${item.route}`;
        }
        let itemGenerator = executeCommand(
          {
            command: commandstring,
            options: {
              cwd: process.cwd(),
              maxBuffer: 2000 * 1024,
              stdio: [0, 1, 2]
            }
          });
      });
    };
    const generateItemsFromJSON = (obj: NgAppStructure) => {
      let itemsToGenerateExist = false;
      for (let prop in obj) {
        let objProp = obj[prop];
        if (prop !== 'package' && objProp.length > 0) {
          itemsToGenerateExist = true;
          createAndStepIntoDirectory
            .run({
              directoryName: prop,
              dryRun: commandOptions.dryRun
            })
            .then((dirName: string) => {
              this.ui.writeLine(chalk.green(`The ${prop} name is ${dirName}`));
              generateItems(
                {
                  projectJSONProperty: objProp,
                  directoryName: prop
                });
            })
            .catch(() => {
              generateItems(
                {
                  projectJSONProperty: objProp,
                  directoryName: prop
                });
            });
        }
      }
      if (!itemsToGenerateExist) {
        return;
      }
    }

    if (packageOptions) {
      if (packageOptions.dryRun) {
        commandOptions.dryRun = true;
      }

      if (packageOptions.blueprint) {
        commandOptions.blueprint = packageOptions.blueprint;
      }

      if (packageOptions.directory) {
        commandOptions.directory = packageOptions.directory;
      }
    }

    this.ui.writeLine(chalk.cyan(`The raw arguments are ${rawArgs}`));
    this.ui.writeLine(chalk.red(`The packageName is ${packageName}`));
    if (!packageName) {
      return Promise.reject(new SilentError(
        `The "ng ${this.name}" command requires a name argument to be specified. ` +
        `For more details, use "ng help".`));
    }

    commandOptions.name = packageName;
    if (commandOptions.dryRun) {
      commandOptions.skipGit = true;
    }

    commandOptions.blueprint = normalizeBlueprint(commandOptions.blueprint);

    const runCommand = (options: {}, ngAppObj:NgAppStructure, callback) => {
      generatePackage(options);
      process.chdir(`${packageName}/src/app`);
      generateItemsFromJSON(ngAppObj);
      callback('Items Generated!');
    }

    return runCommand(commandOptions, projectJSON, (result: string) => {
      this.ui.writeLine(chalk.green(result));
    });
  }
});

module.exports = NewFromJSONCommand;
module.exports.overrideCore = true;
