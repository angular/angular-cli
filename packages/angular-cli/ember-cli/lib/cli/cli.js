'use strict';

var lookupCommand       = require('./lookup-command');
var Promise             = require('../ext/promise');
var getOptionArgs       = require('../utilities/get-option-args');
var debug               = require('debug')('ember-cli:cli');
var debugTesting        = require('debug')('ember-cli:testing');
var PlatformChecker     = require('../utilities/platform-checker');
var InstallationChecker = require('../models/installation-checker');

function CLI(options) {
  this.name = options.name;
  this.ui = options.ui;
  this.analytics = options.analytics;
  this.testing = options.testing;
  this.disableDependencyChecker = options.disableDependencyChecker;
  this.root = options.root;
  this.npmPackage = options.npmPackage;

  debug('testing %o', !!this.testing);
}

module.exports = CLI;

CLI.prototype.run = function(environment) {
  return Promise.hash(environment).then(function(environment) {
    var args = environment.cliArgs.slice();

    if (args[0] === '--help') {
      if (args.length === 1) {
        args[0] = 'help';
      } else {
        args.shift();
        args.push('--help');
      }
    }

    var commandName = args.shift();
    var commandArgs = args;
    var helpOptions;
    var update;

    var CurrentCommand = lookupCommand(environment.commands, commandName, commandArgs, {
      project: environment.project,
      ui: this.ui
    });

    var command = new CurrentCommand({
      ui:        this.ui,
      analytics: this.analytics,
      commands:  environment.commands,
      tasks:     environment.tasks,
      project:   environment.project,
      settings:  environment.settings,
      testing:   this.testing,
      cli: this
    });

    getOptionArgs('--verbose', commandArgs).forEach(function(arg) {
      process.env['EMBER_VERBOSE_' + arg.toUpperCase()] = 'true';
    });

    var platform = new PlatformChecker(process.version);
    if (!platform.isValid && !this.testing) {
      if (platform.isDeprecated) {
        this.ui.writeDeprecateLine('Node ' + process.version +
                                   ' is no longer supported by Ember CLI. Please update to a more recent version of Node');
      }

      if (platform.isUntested) {
        this.ui.writeWarnLine('WARNING: Node ' + process.version +
                              ' has currently not been tested against Ember CLI and may result in unexpected behaviour.');
      }
    }

    debug('command: %s', commandName);

    if (!this.testing) {
      process.chdir(environment.project.root);
      var skipInstallationCheck = commandArgs.indexOf('--skip-installation-check') !== -1;
      if (environment.project.isEmberCLIProject() && !skipInstallationCheck) {
        new InstallationChecker({ project: environment.project }).checkInstallations();
      }
    }

    command.beforeRun(commandArgs);

    return Promise.resolve(update).then(function() {
      debugTesting('cli: command.validateAndRun');
      return command.validateAndRun(commandArgs);
    }).then(function(result) {
      // if the help option was passed, call the help command
      if (result === 'callHelp') {
        helpOptions = {
          environment: environment,
          commandName: commandName,
          commandArgs: commandArgs
        };

        return this.callHelp(helpOptions);
      }

      return result;
    }.bind(this)).then(function(exitCode) {
      debugTesting('cli: command run complete. exitCode: ' + exitCode);
      // TODO: fix this
      // Possibly this issue: https://github.com/joyent/node/issues/8329
      // Wait to resolve promise when running on windows.
      // This ensures that stdout is flushed so acceptance tests get full output

      return new Promise(function(resolve) {
        if (process.platform === 'win32') {
          setTimeout(resolve, 250, exitCode);
        } else {
          resolve(exitCode);
        }
      });
    }.bind(this));

  }.bind(this)).catch(this.logError.bind(this));
};

CLI.prototype.callHelp = function(options) {
  var environment = options.environment;
  var commandName = options.commandName;
  var commandArgs = options.commandArgs;
  var helpIndex = commandArgs.indexOf('--help');
  var hIndex = commandArgs.indexOf('-h');

  var HelpCommand = lookupCommand(environment.commands, 'help', commandArgs, {
    project: environment.project,
    ui: this.ui
  });

  var help = new HelpCommand({
    ui:        this.ui,
    analytics: this.analytics,
    commands:  environment.commands,
    tasks:     environment.tasks,
    project:   environment.project,
    settings:  environment.settings,
    testing:   this.testing
  });

  if (helpIndex > -1) {
    commandArgs.splice(helpIndex,1);
  }

  if (hIndex > -1) {
    commandArgs.splice(hIndex,1);
  }

  commandArgs.unshift(commandName);

  return help.validateAndRun(commandArgs);
};

CLI.prototype.logError = function(error) {
  if (this.testing && error) {
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  }
  this.ui.errorLog.push(error);
  this.ui.writeError(error);
  return 1;
};
