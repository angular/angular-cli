import * as chalk from 'chalk';
import LinkCli from '../tasks/link-cli';
import NpmInstall from '../tasks/npm-install';

const Promise = require('../ember-cli/lib/ext/promise');
const SilentError = require('silent-error');
const validProjectName = require('../ember-cli/lib/utilities/valid-project-name');
const normalizeBlueprint = require('../ember-cli/lib/utilities/normalize-blueprint-option');
const GitInit = require('../tasks/git-init');


export default function initRun(commandOptions: any, rawArgs: string[]) {
  if (commandOptions.dryRun) {
    commandOptions.skipNpm = true;
  }

  const installBlueprint = new this.tasks.InstallBlueprint({
    ui: this.ui,
    project: this.project
  });

  // needs an explicit check in case it's just 'undefined'
  // due to passing of options from 'new' and 'addon'
  let gitInit: any;
  if (commandOptions.skipGit === false) {
    gitInit = new GitInit({
      ui: this.ui,
      project: this.project
    });
  }

  let npmInstall: any;
  if (!commandOptions.skipNpm) {
    npmInstall = new NpmInstall({
      ui: this.ui,
      project: this.project
    });
  }

  let linkCli: any;
  if (commandOptions.linkCli) {
    linkCli = new LinkCli({
      ui: this.ui,
      project: this.project
    });
  }

  const project = this.project;
  const packageName = commandOptions.name !== '.' && commandOptions.name || project.name();

  if (!packageName) {
    const message = 'The `ng ' + this.name + '` command requires a ' +
      'package.json in current folder with name attribute or a specified name via arguments. ' +
      'For more details, use `ng help`.';

    return Promise.reject(new SilentError(message));
  }

  const blueprintOpts = {
    dryRun: commandOptions.dryRun,
    blueprint: 'ng2',
    rawName: packageName,
    targetFiles: rawArgs || '',
    rawArgs: rawArgs.toString(),
    sourceDir: commandOptions.sourceDir,
    style: commandOptions.style,
    prefix: commandOptions.prefix,
    routing: commandOptions.routing,
    inlineStyle: commandOptions.inlineStyle,
    inlineTemplate: commandOptions.inlineTemplate,
    ignoredUpdateFiles: ['favicon.ico'],
    skipGit: commandOptions.skipGit,
    skipTests: commandOptions.skipTests
  };

  if (!validProjectName(packageName)) {
    return Promise.reject(
      new SilentError('We currently do not support a name of `' + packageName + '`.'));
  }

  blueprintOpts.blueprint = normalizeBlueprint(blueprintOpts.blueprint);

  return installBlueprint.run(blueprintOpts)
    .then(function () {
      if (commandOptions.skipGit === false) {
        return gitInit.run(commandOptions, rawArgs);
      }
    })
    .then(function () {
      if (!commandOptions.skipNpm) {
        return npmInstall.run();
      }
    })
    .then(function () {
      if (commandOptions.linkCli) {
        return linkCli.run();
      }
    })
    .then(() => {
      this.ui.writeLine(chalk.green(`Project '${packageName}' successfully created.`));
    });
}
