import * as path from 'path';
import { filter } from 'rxjs/operators';
import { logging, terminal } from '@angular-devkit/core';
import { runCommand } from '../../models/command-runner';

const Project = require('../../ember-cli/lib/models/project');


function loadCommands() {
  return {
    'add': require('../../commands/add').default,
    'build': require('../../commands/build').default,
    'serve': require('../../commands/serve').default,
    'new': require('../../commands/new').default,
    'generate': require('../../commands/generate').default,
    'test': require('../../commands/test').default,
    'e2e': require('../../commands/e2e').default,
    'help': require('../../commands/help').default,
    'lint': require('../../commands/lint').default,
    'version': require('../../commands/version').default,
    'doc': require('../../commands/doc').default,
    'xi18n': require('../../commands/xi18n').default,
    'update': require('../../commands/update').default,
    'run': require('../../commands/run').default,

    // Easter eggs.
    'make-this-awesome': require('../../commands/easter-egg').default,

    // Configuration.
    'config': require('../../commands/config').default,
  };
}

export default async function(options: any) {
  // ensure the environemnt variable for dynamic paths
  process.env.PWD = path.normalize(process.env.PWD || process.cwd());
  process.env.CLI_ROOT = process.env.CLI_ROOT || path.resolve(__dirname, '..', '..');

  const commands = loadCommands();

  const logger = new logging.IndentLogger('cling');
  let loggingSubscription;
  if (!options.testing) {
    loggingSubscription = initializeLogging(logger);
  }
  const context = {
    project: Project.projectOrnullProject(undefined, undefined),
  };

  try {
    const maybeExitCode = await runCommand(commands, options.cliArgs, logger, context);
    if (typeof maybeExitCode === 'number') {
      console.assert(Number.isInteger(maybeExitCode));

      return maybeExitCode;
    }

    return 0;
  } catch (err) {
    if (err instanceof Error) {
      logger.fatal(err.message);
      logger.fatal(err.stack);
    } else if (typeof err === 'string') {
      logger.fatal(err);
    } else if (typeof err === 'number') {
      // Log nothing.
    } else {
      logger.fatal('An unexpected error occured: ' + JSON.stringify(err));
    }

    if (options.testing) {
      debugger;
      throw err;
    }

    loggingSubscription.unsubscribe();
    return 1;
  }
}

// Initialize logging.
function initializeLogging(logger: logging.Logger) {
  return logger
    .pipe(filter(entry => (entry.level != 'debug')))
    .subscribe(entry => {
      let color = (x: string) => terminal.dim(terminal.white(x));
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
