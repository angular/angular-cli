/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging, terminal } from '@angular-devkit/core';
import { filter } from 'rxjs/operators';
import { AddCommand } from '../../commands/add';
import { BuildCommand } from '../../commands/build';
import { ConfigCommand } from '../../commands/config';
import { DocCommand } from '../../commands/doc';
import { E2eCommand } from '../../commands/e2e';
import { AwesomeCommand } from '../../commands/easter-egg';
import { EjectCommand } from '../../commands/eject';
import { GenerateCommand } from '../../commands/generate';
import { GetSetCommand } from '../../commands/getset';
import { HelpCommand } from '../../commands/help';
import { LintCommand } from '../../commands/lint';
import { NewCommand } from '../../commands/new';
import { RunCommand } from '../../commands/run';
import { ServeCommand } from '../../commands/serve';
import { TestCommand } from '../../commands/test';
import { UpdateCommand } from '../../commands/update';
import { VersionCommand } from '../../commands/version';
import { Xi18nCommand } from '../../commands/xi18n';
import { CommandMap, runCommand } from '../../models/command-runner';
import { getProjectDetails } from '../../utilities/project';


async function loadCommands(): Promise<CommandMap> {
  return {
    // Schematics commands.
    'add': AddCommand,
    'new': NewCommand,
    'generate': GenerateCommand,
    'update': UpdateCommand,

    // Architect commands.
    'build': BuildCommand,
    'serve': ServeCommand,
    'test': TestCommand,
    'e2e': E2eCommand,
    'lint': LintCommand,
    'xi18n': Xi18nCommand,
    'run': RunCommand,

    // Disabled commands.
    'eject': EjectCommand,

    // Easter eggs.
    'make-this-awesome': AwesomeCommand,

    // Other.
    'config': ConfigCommand,
    'help': HelpCommand,
    'version': VersionCommand,
    'doc': DocCommand,

    // deprecated
    'get': GetSetCommand,
    'set': GetSetCommand,
  };
}

export default async function(options: { testing?: boolean, cliArgs: string[] }) {
  const commands = await loadCommands();

  const logger = new logging.IndentLogger('cling');
  let loggingSubscription;
  if (!options.testing) {
    loggingSubscription = initializeLogging(logger);
  }

  let projectDetails = getProjectDetails();
  if (projectDetails === null) {
    projectDetails = { root: process.cwd() };
  }
  const context = {
    project: projectDetails,
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
      if (err.stack) {
        logger.fatal(err.stack);
      }
    } else if (typeof err === 'string') {
      logger.fatal(err);
    } else if (typeof err === 'number') {
      // Log nothing.
    } else {
      logger.fatal('An unexpected error occurred: ' + JSON.stringify(err));
    }

    if (options.testing) {
      debugger;
      throw err;
    }

    if (loggingSubscription) {
      loggingSubscription.unsubscribe();
    }

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
