'use strict';

var chalk                 = require('chalk');
var Command               = require('../models/command');
var Promise               = require('../ext/promise');
var Project               = require('../models/project');
var SilentError           = require('silent-error');
var rimraf                = require('rimraf');
var rmdir                 = Promise.denodeify(rimraf);
var validProjectName      = require('../utilities/valid-project-name');
var normalizeBlueprint    = require('../utilities/normalize-blueprint-option');
var mergeBlueprintOptions = require('../utilities/merge-blueprint-options');

module.exports = Command.extend({
  name: 'new',
  description: 'Creates a new directory and runs ' + chalk.green('ember init') + ' in it.',
  works: 'outsideProject',

  availableOptions: [
    { name: 'dry-run',    type: Boolean, default: false, aliases: ['d'] },
    { name: 'verbose',    type: Boolean, default: false, aliases: ['v'] },
    { name: 'blueprint',  type: String,  default: 'app', aliases: ['b'] },
    { name: 'skip-npm',   type: Boolean, default: false, aliases: ['sn'] },
    { name: 'skip-bower', type: Boolean, default: false, aliases: ['sb'] },
    { name: 'skip-git',   type: Boolean, default: false, aliases: ['sg'] },
    { name: 'directory',  type: String ,                 aliases: ['dir'] }
  ],

  anonymousOptions: [
    '<app-name>'
  ],

  beforeRun: mergeBlueprintOptions,

  run: function(commandOptions, rawArgs) {
    var packageName = rawArgs[0],
        message;

    commandOptions.name = rawArgs.shift();

    if (!packageName) {
      message = chalk.yellow('The `ember ' + this.name + '` command requires a ' +
                             'name to be specified. For more details, use `ember help`.');

      return Promise.reject(new SilentError(message));
    }

    if (commandOptions.dryRun) {
      commandOptions.skipGit = true;
    }

    if (packageName === '.') {
      var blueprintName = commandOptions.blueprint === 'app' ? 'application' : commandOptions.blueprint;
      message = 'Trying to generate an ' + blueprintName + ' structure in this directory? Use `ember init` instead.';

      return Promise.reject(new SilentError(message));
    }

    if (!validProjectName(packageName)) {
      message = 'We currently do not support a name of `' + packageName + '`.';

      return Promise.reject(new SilentError(message));
    }

    commandOptions.blueprint = normalizeBlueprint(commandOptions.blueprint);

    if (!commandOptions.directory) {
      commandOptions.directory = packageName;
    }

    var createAndStepIntoDirectory = new this.tasks.CreateAndStepIntoDirectory({
      ui: this.ui,
      analytics: this.analytics
    });
    var InitCommand = this.commands.Init;

    var initCommand = new InitCommand({
      ui: this.ui,
      analytics: this.analytics,
      tasks: this.tasks,
      project: Project.nullProject(this.ui, this.cli)
    });

    return createAndStepIntoDirectory
      .run({
        directoryName: commandOptions.directory,
        dryRun: commandOptions.dryRun
      })
      .then(function(opts) {
        return initCommand
          .run(commandOptions, rawArgs)
          .catch(function(err) {
            var dirName = commandOptions.directory;
            process.chdir(opts.initialDirectory);
            return rmdir(dirName).then(function() {
              console.log(chalk.red('Error creating new application. Removing generated directory `./' + dirName + '`'));
              throw err;
            });
          });
      });
  }
});
