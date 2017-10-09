import * as chalk from 'chalk';
import LinkCli from '../tasks/link-cli';
import NpmInstall from '../tasks/npm-install';
import {checkYarnOrCNPM} from '../utilities/check-package-manager';
import {CliConfig} from '../models/config';

const Task = require('../ember-cli/lib/models/task');
const GitInit = require('../tasks/git-init');
const packageJson = require('../package.json');


export default Task.extend({

  run: function (commandOptions: any, rawArgs: string[]) {
    if (commandOptions.dryRun) {
      commandOptions.skipInstall = true;
    }

    // needs an explicit check in case it's just 'undefined'
    // due to passing of options from 'new' and 'addon'
    let gitInit: any;
    if (commandOptions.skipGit === false) {
      gitInit = new GitInit({
        ui: this.ui,
        project: this.project
      });
    }

    const packageManager = CliConfig.fromGlobal().get('packageManager');

    let npmInstall: any;
    if (!commandOptions.skipInstall) {
      npmInstall = new NpmInstall({
        ui: this.ui,
        project: this.project,
        packageManager
      });
    }

    let linkCli: any;
    if (commandOptions.linkCli) {
      linkCli = new LinkCli({
        ui: this.ui,
        project: this.project,
        packageManager
      });
    }

    if (commandOptions.style === undefined) {
      commandOptions.style = CliConfig.fromGlobal().get('defaults.styleExt');
    }

    const SchematicRunTask = require('../tasks/schematic-run').default;
    const schematicRunTask = new SchematicRunTask({
      ui: this.ui,
      project: this.project
    });

    const cwd = this.project.root;
    const schematicName = CliConfig.fromGlobal().get('defaults.schematics.newApp');
    commandOptions.version = packageJson.version;

    const runOptions = {
      taskOptions: commandOptions,
      workingDir: cwd,
      emptyHost: true,
      collectionName: commandOptions.collectionName,
      schematicName
    };

    return schematicRunTask.run(runOptions)
      .then(function () {
        if (!commandOptions.dryRun) {
          process.chdir(commandOptions.directory);
        }
      })
      .then(function () {
        if (!commandOptions.skipInstall) {
          return checkYarnOrCNPM().then(() => npmInstall.run());
        }
      })
      .then(function () {
        if (!commandOptions.dryRun && commandOptions.skipGit === false) {
          return gitInit.run(commandOptions, rawArgs);
        }
      })
      .then(function () {
        if (!commandOptions.dryRun && commandOptions.linkCli) {
          return linkCli.run();
        }
      })
      .then(() => {
        if (!commandOptions.dryRun) {
          this.ui.writeLine(chalk.green(`Project '${commandOptions.name}' successfully created.`));
        }
      });
  }
});
