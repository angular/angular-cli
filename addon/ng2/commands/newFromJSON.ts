/// <reference path="../../../typings/index.d.ts" />

import * as Command from 'ember-cli/lib/models/command';
import * as SilentError from 'silent-error';
import { execSync, exec } from 'child_process';
import * as Promise from 'ember-cli/lib/ext/promise';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as validProjectName from 'ember-cli/lib/utilities/valid-project-name';
import * as GenerateCommand from './generate';
import {NgAppStructure} from '../models/newFromJSON.model';

const normalizeBlueprint = require('ember-cli/lib/utilities/normalize-blueprint-option');
const fsReadFile = Promise.denodeify(fs.readFile);
const fsWriteFile = Promise.denodeify(fs.writeFile);
const fsReadDir = Promise.denodeify(fs.readdir);
const fsCopy = Promise.denodeify(fse.copy);
const fileStats = Promise.denodeify(fs.stat);
const execPromise = Promise.denodeify(exec);


const NewFromJSONCommand = Command.extend({
  name: 'newfromjson',
  works: 'outsideProject',

  availableOptions: [
  ],
  
  run: function (commandOptions, rawArgs) {

    let projectJSON: NgAppStructure;

    const ui = this.ui;
    const chDir = process.chdir;
    const execOptions = {
      cwd: process.cwd(),
      maxBuffer: 2000 * 1024,
      stdio: [0, 1, 2]
    };
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

    let checkForExisting = (path: string) => {
      return fileStats(path);
    };

    let checkForPackage = (packageName: string) => {
      return checkForExisting(`${packageName}/angular-cli.json`)
    };

    let checkForItem = (typeOfItem: string, itemName: string) => {
      return checkForExisting(`${typeOfItem}/${itemName}`)
    };

    let newPackage = (packageObject: {
      name: string, blueprint?: string, dryRun?: boolean, verbose?: boolean, skipNpm?: boolean, skipGit?: boolean, directory?: string, flat?: boolean, default?: boolean, lazy?: boolean, skipRouterGeneration?: boolean, route?: string
    }) => {
      return checkForPackage(packageObject.name)
        .then(() => {
          let msg = `${packageObject.name} already exists, changing directories.`
          ui.writeLine(chalk.yellow(msg));
          Promise.resolve();
        })
        .catch(() => {
          let commandString = execCommandString('package', packageObject);
          //return execSync(commandString, execOptions);
          //p_list.push({ process: packageChildProcess, content: "" });
          return execPromise(commandString, execOptions);
        })
    };

    let generateItem = (typeOfItem: string, itemObject: {
      name: string, blueprint?: string, dryRun?: boolean, verbose?: boolean, skipNpm?: boolean, skipGit?: boolean, directory?: string, flat?: boolean, default?: boolean, lazy?: boolean, skipRouterGeneration?: boolean, route?: string
    }) => {
      let itemObjectName = itemObject.lazy === false ? itemObject.name : `+${itemObject.name}`;
      return checkForItem(typeOfItem, itemObjectName)
        .then(() => {
          let msg = `${itemObject.name} already exists, moving on.`;
          ui.writeLine(chalk.yellow(msg));
          Promise.resolve();
        })
        .catch(() => {
          let commandString = execCommandString(typeOfItem, itemObject);
          //return execSync(commandString, execOptions);
          return execPromise(commandString, execOptions);
        });
    };
    const itemTypes = ['routes', 'components', 'pipes', 'services', 'directives', 'classes', 'enums'];

    return getJSONFile()
      .then(newProject)
      .then(changeToProjectDirectory)
      .then(makeItemDirectories)
      .then(generateProjectItems)
      .then(ui.writeLine(chalk.blue(`This should only happen when I'm finished.`)))
      .catch((err) => {
        ui.writeLine(chalk.red(`This command requires a file named ng-project.json`));
      });

    function getJSONFile() {
      return fsReadFile('ng-project.json', 'utf8')
        .then((data: string) => {
          projectJSON = <NgAppStructure>JSON.parse(data);
        })
    }

    function newProject() {
      return newPackage(projectJSON.package)
        .then(() => {
          ui.writeLine(chalk.green(`${projectJSON.package.name} project complete.`));
        });
    }

    function changeToProjectDirectory() {
      return (() => {
        chDir(`${projectJSON.package.name}/src/app`)
        ui.writeLine(chalk.cyan(`Now in "${projectJSON.package.name}/src/app"...`));
      })();
    }

    function createProjectDirectories(directoryName: string) {
      return createAndStepIntoDirectory
        .run({
          directoryName: directoryName,
          dryRun: projectJSON.package.dryRun
        })
    }

    function createEachItem(typeOfItem: string, item: {}) {
      return generateItem(typeOfItem, item)
        //.then(() => {
        //  ui.writeLine(chalk.green(`${item.name} has been created`));
        //});
    }

    function makeItemDirectories() {
      return itemTypes.forEach((type: string) => {
        if (projectJSON[type] && projectJSON[type].length) {
          return createProjectDirectories(type)
            .then((dirName: string) => {
              chDir('..');
              ui.writeLine(chalk.cyan(`Now in "${process.cwd()}"...`));
            })
            .catch(() => {
              ui.writeLine(chalk.magenta(`Directory "${type}" already exists.`));
              Promise.resolve();
            });
        }
        else { return; }
      });
    }

    function generateProjectItems() {
      return itemTypes.forEach((type: string) => {
        let items: {}[] = projectJSON[type] && projectJSON[type].length ? projectJSON[type] : null;

        if (!!items) {
          return items.forEach((item) => {
            return generateItem(type, item)
              .then(() => {
                ui.writeLine(chalk.green(`${item.name} has been created`));
              })
              .catch((err) => {
                ui.writeLine(chalk.red(`${item.name} creation has failed with ${err.message}`));
              });
           });
        }
        else { return; }
      });
    }

    function execCommandString(property: string, objectToCreate: {
      name: string, blueprint?: string, dryRun?: boolean, verbose?: boolean, skipNpm?: boolean, skipGit?: boolean, directory?: string, flat?: boolean, default?: boolean, lazy?: boolean, skipRouterGeneration?: boolean, route?: string
    }) {
      let commandstring = property === 'package' ? `ng new ${objectToCreate.name}` : `ng generate ${commandAliases[property]} /${property}/${objectToCreate.name}`;
      if (objectToCreate.dryRun) { commandstring += ' --dry-run'; }
      if (objectToCreate.verbose) { commandstring += ' --verbose'; }
      if (objectToCreate.skipNpm) { commandstring += ' --skip-npm'; }
      if (objectToCreate.skipGit) { commandstring += ' --skip-git'; }
      if (objectToCreate.directory) { commandstring += ` --directory=${objectToCreate.directory}`; }
      if (objectToCreate.blueprint) { commandstring += ` --blueprint=${objectToCreate.blueprint}`; }
      if (objectToCreate.flat) { commandstring += ' --flat'; }
      if (objectToCreate.default) { commandstring += ' --default'; }
      if (objectToCreate.skipRouterGeneration) { commandstring += ' --skip-router-generation'; }
      if (objectToCreate.lazy === false) { commandstring += ' --lazy=false'; }
      if (objectToCreate.route) { commandstring += ` --route=${objectToCreate.route}`; }

      return commandstring;
    }
  }
});

module.exports = NewFromJSONCommand;
module.exports.overrideCore = true;
