import * as chalk from 'chalk';
import * as Command from 'ember-cli/lib/models/command';
import * as Project from 'ember-cli/lib/models/project';
import * as SilentError from 'silent-error';
import * as validProjectName from 'ember-cli/lib/utilities/valid-project-name';

const normalizeBlueprint = require('ember-cli/lib/utilities/normalize-blueprint-option');
//const InitCommand = require('./init');
const NewCommand = require('./new');
const GenerateCommand = require('./generate');
const fs = require('fs');

const NewFromJSONCommand = Command.extend({
  name: 'newfromjson',
  description: `Creates a new directory and runs ${chalk.green('ng init')} in it.`,
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
    let newProject = new NewCommand({ ui: this.ui, analytics: this.analytics });

    const projectJSON: JSON = require('./ng-project.json');

    if (!projectJSON) {
      return newProject.run.bind(newProject, commandOptions, rawArgs);
    }
    const packageName = projectJSON.package.name;

    commandOptions = projectJSON.package.options || commandOptions || {};
    commandOptions.name = packageName;

    if (commandOptions.dryRun) {
      commandOptions.skipGit = true;
    }

    if (packageName === '.') {
      return Promise.reject(new SilentError(
        `Trying to generate an application structure in this directory? Use "ng init" ` +
        `instead.`));
    }

    if (!validProjectName(packageName)) {
      return Promise.reject(
        new SilentError(`We currently do not support a name of "${packageName}".`));
    }

    commandOptions.blueprint = normalizeBlueprint(commandOptions.blueprint);

    if (!commandOptions.directory) {
      commandOptions.directory = packageName;
    }

    rawArgs.push(packageName);

    return newProject.run.bind(newProject, commandOptions, rawArgs)
      .then(
      () => {
        var cwd = process.cwd();
        process.chdir(`${packageName}/app`);
        const createAndStepIntoDirectory =
          new this.tasks.CreateAndStepIntoDirectory({ ui: this.ui, analytics: this.analytics });

        if (projectJSON.routes && projectJSON.routes.length) {
          createAndStepIntoDirectory
            .run({
              directoryName: 'routes',
              dryRun: commandOptions.dryRun
            })
            .then(() => {
              projectJSON.routes.forEach((route) => {
                let newRoute = new GenerateCommand();
                newRoute.beforeRun(['route', route]);
              })
            })
        };
        if (projectJSON.components && projectJSON.components.length) { };
        if (projectJSON.directives && projectJSON.directives.length) { };
        if (projectJSON.services && projectJSON.services.length) { };
        if (projectJSON.pipes && projectJSON.pipes.length) { };
        if (projectJSON.classes && projectJSON.classes.length) { };
        if (projectJSON.enums && projectJSON.enums.length) { };
        return { initialDirectory: cwd };
      })
  }
});

module.exports = NewFromJSONCommand;
module.exports.overrideCore = true;
