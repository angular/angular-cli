'use strict';

const RSVP = require('rsvp');

const lookupCommand = require('./lookup-command');
const getOptionArgs = require('../utilities/get-option-args');
let logger = require('heimdalljs-logger')('ember-cli:cli');
let loggerTesting = require('heimdalljs-logger')('ember-cli:testing');
const heimdall = require('heimdalljs');

const Promise = RSVP.Promise;
// Disabled until e2e and serve command can be evaluated/corrected -- require('../utilities/will-interrupt-process');
const onProcessInterrupt = { addHandler: (_handler) => { }, removeHandler: (_handler) => { } };

class CLI {
  /**
   * @private
   * @class CLI
   * @constructor
   * @param options
   */
  constructor(options) {
    /**
     * @private
     * @property name
     */
    this.name = options.name;

    /**
     * @private
     * @property ui
     * @type UI
     */
    this.ui = options.ui;

    /**
     * @private
     * @property analytics
     */
    this.analytics = options.analytics;

    /**
     * @private
     * @property testing
     * @type Boolean
     */
    this.testing = options.testing;

    /**
     * @private
     * @property disableDependencyChecker
     * @type Boolean
     */
    this.disableDependencyChecker = options.disableDependencyChecker;

    /**
     * @private
     * @property root
     */
    this.root = options.root;

    /**
     * @private
     * @property npmPackage
     */
    this.npmPackage = options.npmPackage;

    /**
     * @private
     * @property instrumentation
     */
    this.instrumentation = {
      stopAndReport: (...args) => { },
      start: (...args) => { },
    };

    logger.info('testing %o', !!this.testing);
  }

  /**
   * @private
   * @method run
   * @param environment
   * @return {Promise}
   */
  run(environment) {
    let shutdownOnExit = null;

    return RSVP.hash(environment).then(environment => {
      let args = environment.cliArgs.slice();

      if (args.length === 0) {
        args[0] = 'help';
      }

      if (args[0] === '--help') {
        if (args.length === 1) {
          args[0] = 'help';
        } else {
          args.shift();
          args.push('--help');
        }
      }

      let commandName = args.shift();
      let commandArgs = args;
      let helpOptions;

      let commandLookupCreationtoken = heimdall.start('lookup-command');

      let CurrentCommand = lookupCommand(environment.commands, commandName, commandArgs, {
        project: environment.project,
        ui: this.ui,
      });

      let command = new CurrentCommand({
        ui: this.ui,
        analytics: this.analytics,
        commands: environment.commands,
        tasks: environment.tasks,
        project: environment.project,
        settings: environment.settings,
        testing: this.testing,
        cli: this,
      });

      commandLookupCreationtoken.stop();

      getOptionArgs('--verbose', commandArgs).forEach(arg => {
        process.env[`EMBER_VERBOSE_${arg.toUpperCase()}`] = 'true';
      });

      logger.info('command: %s', commandName);

      if (!this.testing) {
        let skipInstallationCheck = commandArgs.indexOf('--skip-installation-check') !== -1;
        if (environment.project.isEmberCLIProject() && !skipInstallationCheck) {
          const InstallationChecker = require('../models/installation-checker');
          new InstallationChecker({ project: environment.project }).checkInstallations();
        }
      }

      let instrumentation = this.instrumentation;
      let onCommandInterrupt;

      let runPromise = Promise.resolve().then(() => {
        instrumentation.stopAndReport('init');
        instrumentation.start('command');

        loggerTesting.info('cli: command.beforeRun');
        onProcessInterrupt.addHandler(onCommandInterrupt);

        return command.beforeRun(commandArgs);
      }).then(() => {
        loggerTesting.info('cli: command.validateAndRun');

        return command.validateAndRun(commandArgs);
      }).then(result => {
        instrumentation.stopAndReport('command', commandName, commandArgs);

        onProcessInterrupt.removeHandler(onCommandInterrupt);

        return result;
      }).finally(() => {
        instrumentation.start('shutdown');
        shutdownOnExit = function() {
          instrumentation.stopAndReport('shutdown');
        };
      }).then(result => {
        // if the help option was passed, call the help command
        if (result === 'callHelp') {
          helpOptions = {
            environment,
            commandName,
            commandArgs,
          };

          return this.callHelp(helpOptions);
        }

        return result;
      }).then(exitCode => {
        loggerTesting.info(`cli: command run complete. exitCode: ${exitCode}`);
        // TODO: fix this
        // Possibly this issue: https://github.com/joyent/node/issues/8329
        // Wait to resolve promise when running on windows.
        // This ensures that stdout is flushed so acceptance tests get full output

        return new Promise(resolve => {
          if (process.platform === 'win32') {
            setTimeout(resolve, 250, exitCode);
          } else {
            resolve(exitCode);
          }
        });
      });

      onCommandInterrupt = () =>
        Promise.resolve(command.onInterrupt())
          .then(() => runPromise);

      return runPromise;
    })
    .finally(() => {
      if (shutdownOnExit) {
        shutdownOnExit();
      }
    })
    .catch(this.logError.bind(this));
  }

  /**
   * @private
   * @method callHelp
   * @param options
   * @return {Promise}
   */
  callHelp(options) {
    let environment = options.environment;
    let commandName = options.commandName;
    let commandArgs = options.commandArgs;
    let helpIndex = commandArgs.indexOf('--help');
    let hIndex = commandArgs.indexOf('-h');

    let HelpCommand = lookupCommand(environment.commands, 'help', commandArgs, {
      project: environment.project,
      ui: this.ui,
    });

    let help = new HelpCommand({
      ui: this.ui,
      analytics: this.analytics,
      commands: environment.commands,
      tasks: environment.tasks,
      project: environment.project,
      settings: environment.settings,
      testing: this.testing,
    });

    if (helpIndex > -1) {
      commandArgs.splice(helpIndex, 1);
    }

    if (hIndex > -1) {
      commandArgs.splice(hIndex, 1);
    }

    commandArgs.unshift(commandName);

    return help.validateAndRun(commandArgs);
  }

  /**
   * @private
   * @method logError
   * @param error
   * @return {number}
   */
  logError(error) {
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
  }
}

module.exports = CLI;
