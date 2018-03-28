'use strict';

const { logging, terminal } = require('@angular-devkit/core');
const filter = require('rxjs/operators').filter;

const yargsParser = require('yargs-parser');
const runCommand = require('../../../models/command-runner').runCommand;


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
  }

  /**
   * @private
   * @method run
   * @param environment
   * @return {Promise}
   */
  async run(environment) {

    const logger = new logging.IndentLogger('cling');
    let loggingSubscription;
    if (!this.testing) {
      loggingSubscription = this.initializeLogging(logger);
    }
    const context = {
      project: environment.project,
      ui: this.ui,
    };

    try {
      const maybeExitCode = await runCommand(environment.commands, environment.cliArgs, logger, context);
      return Number.isInteger(maybeExitCode) ? maybeExitCode : 0;
    } catch (err) {
      if (typeof err === 'object') {
        logger.fatal(err.message);
        logger.fatal(err.stack);
      } else if (typeof err === 'string') {
        logger.fatal(err);
      } else if (typeof err === 'number') {
        // Log nothing.
      } else {
        logger.fatal('An unexpected error occured: ' + JSON.stringify(err));
      }

      if (this.testing) {
        debugger;
        throw err;
      }
      loggingSubscription.unsubscribe();
      return 1;
    }
  }

  // Initialize logging.
  initializeLogging(logger) {
    return logger
      .pipe(filter(entry => (entry.level != 'debug')))
      .subscribe(entry => {
        let color = x => terminal.dim(terminal.white(x));
        let output = process.stdout;
        switch (entry.level) {
          case 'info':
            color = terminal.white;
            break;
          case 'warn':
            color = terminal.yellow;
            break;
          case 'error':
            color = terminal.red;
            output = process.stderr;
            break;
          case 'fatal':
            color = (x) => terminal.bold(terminal.red(x));
            output = process.stderr;
            break;
        }

        output.write(color(entry.message) + '\n');
      });
  }
}

module.exports = CLI;
