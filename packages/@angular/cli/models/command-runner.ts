import {
  Option,
  CommandContext,
  Command,
  CommandConstructor,
  CommandScope,
  ArgumentStrategy
} from '../models/command';
import { logging, normalize, tags } from '@angular-devkit/core';
import { camelize } from '@angular-devkit/core/src/utils/strings';
import { findUp } from '../utilities/find-up';

import * as yargsParser from 'yargs-parser';
import * as fs from 'fs';
import { join } from 'path';

const SilentError = require('silent-error');

export interface CommandMap {
  [key: string]: CommandConstructor;
}

/**
 * Run a command.
 * @param commandMap Map of available commands.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param context Execution context.
 */
export async function runCommand(commandMap: CommandMap,
                                 args: string[],
                                 logger: logging.Logger,
                                 context: CommandContext): Promise<number | void> {

  // if not args supplied, just run the help command.
  if (!args || args.length === 0) {
    args = ['help'];
  }
  const rawOptions = yargsParser(args, { alias: { help: ['h'] }, boolean: [ 'help' ] });
  let commandName = rawOptions._[0];

  // remove the command name
  rawOptions._ = rawOptions._.slice(1);
  const executionScope = context.project.isEmberCLIProject()
    ? CommandScope.inProject
    : CommandScope.outsideProject;

  let Cmd: CommandConstructor;
  Cmd = findCommand(commandMap, commandName);

  if (!Cmd && !commandName && (rawOptions.v || rawOptions.version)) {
    commandName = 'version';
    Cmd = findCommand(commandMap, commandName);
  }

  if (!Cmd && rawOptions.help) {
    commandName = 'help';
    Cmd = findCommand(commandMap, commandName);
  }

  if (!Cmd) {
    function levenshtein(a: string, b: string): number {
      if (a.length === 0) {
        return b.length;
      }
      if (b.length === 0) {
        return a.length;
      }

      if (a.length > b.length) {
        let tmp = a;
        a = b;
        b = tmp;
      }

      const row = Array(a.length);
      for (let i = 0; i <= a.length; i++) {
        row[i] = i;
      }

      let result: number;
      for (let i = 1; i <= b.length; i++) {
        result = i;

        for (let j = 1; j <= a.length; j++) {
          let tmp = row[j - 1];
          row[j - 1] = result;
          result = b[i - 1] === a[j - 1]
            ? tmp
            : Math.min(tmp + 1, Math.min(result + 1, row[j] + 1));
        }
      }

      return result;
    }

    const commandsDistance = {} as { [name: string]: number };
    const allCommands = listAllCommandNames(commandMap).sort((a, b) => {
      if (!(a in commandsDistance)) {
        commandsDistance[a] = levenshtein(a, commandName);
      }
      if (!(b in commandsDistance)) {
        commandsDistance[b] = levenshtein(b, commandName);
      }
      return commandsDistance[a] - commandsDistance[b];
    });

    logger.error(tags.stripIndent`
        The specified command ("${commandName}") is invalid. For a list of available options,
        run "ng help".

        Did you mean "${allCommands[0]}"?
    `);

    return 1;
  }

  const command = new Cmd(context, logger);

  args = await command.initializeRaw(args);
  let options = parseOptions(args, command.options, command.arguments, command.argStrategy);
  await command.initialize(options);
  options = parseOptions(args, command.options, command.arguments, command.argStrategy);
  if (commandName === 'help') {
    options.commandMap = commandMap;
  }

  if (options.help) {
    return await runHelp(command, options);
  } else {
    verifyCommandInScope(command, executionScope);
    verifyWorkspace(
      command,
      executionScope,
      context.project.root,
      command.allowMissingWorkspace ? logger : null,
    );
    delete options.h;
    delete options.help;
    return await validateAndRunCommand(command, options);
  }
}

export function parseOptions<T = any>(
  args: string[],
  cmdOpts: Option[],
  commandArguments: string[],
  argStrategy: ArgumentStrategy,
): T {
  const parser = yargsParser;

  const aliases = cmdOpts.concat()
    .filter(o => o.aliases && o.aliases.length > 0)
    .reduce((aliases: any, opt: Option) => {
      aliases[opt.name] = opt.aliases
        .filter(a => a.length === 1);
      return aliases;
    }, {});

  const booleans = cmdOpts
    .filter(o => o.type && o.type === Boolean)
    .map(o => o.name);

  const defaults = cmdOpts
    .filter(o => o.default !== undefined || booleans.indexOf(o.name) !== -1)
    .reduce((defaults: any, opt: Option) => {
      defaults[opt.name] = opt.default;
      return defaults;
    }, {});

  const strings = cmdOpts
    .filter(o => o.type === String)
    .map(o => o.name);

  const numbers = cmdOpts
    .filter(o => o.type === Number)
    .map(o => o.name);


  aliases.help = ['h'];
  booleans.push('help');

  const yargsOptions = {
    alias: aliases,
    boolean: booleans,
    default: defaults,
    string: strings,
    number: numbers
  };

  const parsedOptions = parser(args, yargsOptions);

  // Remove aliases.
  cmdOpts
    .filter(o => o.aliases && o.aliases.length > 0)
    .map(o => o.aliases)
    .reduce((allAliases: any, aliases: string[]) => {
      return allAliases.concat([...aliases]);
    }, [])
    .forEach((alias: string) => {
      delete parsedOptions[alias];
    });

  // Remove undefined booleans
  booleans
    .filter(b => parsedOptions[b] === undefined)
    .map(b => camelize(b))
    .forEach(b => delete parsedOptions[b]);

  // remove options with dashes.
  Object.keys(parsedOptions)
    .filter(key => key.indexOf('-') !== -1)
    .forEach(key => delete parsedOptions[key]);

  // remove the command name
  parsedOptions._ = parsedOptions._.slice(1);

  switch (argStrategy) {
    case ArgumentStrategy.MapToOptions:
      parsedOptions._.forEach((value: string, index: number) => {
        const arg = commandArguments[index];
        if (arg) {
          parsedOptions[arg] = value;
        }
      });

      delete parsedOptions._;
      break;
  }

  return parsedOptions;
}

// Find a command.
function findCommand(map: CommandMap, name: string): CommandConstructor | null {
  let Cmd: CommandConstructor = map[name];

  if (!Cmd) {
    // find command via aliases
    Cmd = Object.keys(map)
      .filter(key => {
        if (!map[key].aliases) {
          return false;
        }
        const foundAlias = map[key].aliases
          .filter((alias: string) => alias === name);

        return foundAlias.length > 0;
      })
      .map((key) => {
        return map[key];
      })[0];
  }

  if (!Cmd) {
    return null;
  }
  return Cmd;
}

function listAllCommandNames(map: CommandMap): string[] {
  return Object.keys(map).concat(
    Object.keys(map)
      .reduce((acc, key) => {
        if (!map[key].aliases) {
          return acc;
        }

        return acc.concat(map[key].aliases);
      }, [] as string[]),
  );
}


function verifyCommandInScope(command: Command, scope = CommandScope.everywhere): void {
  if (!command) {
    return;
  }
  if (command.scope !== CommandScope.everywhere) {
    if (command.scope !== scope) {
      let errorMessage: string;
      if (command.scope === CommandScope.inProject) {
        errorMessage = `This command can only be run inside of a CLI project.`;
      } else {
        errorMessage = `This command can not be run inside of a CLI project.`;
      }
      throw new SilentError(errorMessage);
    }
  }
}

function verifyWorkspace(
  command: Command,
  executionScope: CommandScope,
  root: string,
  logger: logging.Logger | null = null,
): void {
  if (command.scope === CommandScope.everywhere) {
    return;
  }
  if (executionScope === CommandScope.inProject) {
    if (fs.existsSync(join(root, 'angular.json'))) {
      return;
    }
    if (fs.existsSync(join(root, '.angular.json'))) {
      return;
    }

    // Check if there's an old config file meaning that the project has not been updated
    const oldConfigFileNames = [
      normalize('.angular-cli.json'),
      normalize('angular-cli.json'),
    ];
    const oldConfigFilePath = (root && findUp(oldConfigFileNames, root, true))
      || findUp(oldConfigFileNames, process.cwd(), true)
      || findUp(oldConfigFileNames, __dirname, true);

    // If an old configuration file is found, throw an exception.
    if (oldConfigFilePath) {
      // ------------------------------------------------------------------------------------------
      // If changing this message, please update the same message in
      // `packages/@angular/cli/bin/ng-update-message.js`
      const message = tags.stripIndent`
        The Angular CLI configuration format has been changed, and your existing configuration can
        be updated automatically by running the following command:

          ng update @angular/cli --migrate-only --from=1
      `;

      if (!logger) {
        throw new SilentError(message);
      } else {
        logger.warn(message);
        return;
      }
    }

    // If no configuration file is found (old or new), throw an exception.
    throw new SilentError('Invalid project: missing workspace file.');
  }
}

// Execute a command's `printHelp`.
async function runHelp<T>(command: Command<T>, options: T): Promise<void> {
  return await command.printHelp(options);
}

// Validate and run a command.
async function validateAndRunCommand<T>(command: Command<T>, options: T): Promise<number | void> {
  const isValid = await command.validate(options);
  if (isValid !== undefined && !isValid) {
    throw new SilentError(`Validation error. Invalid command`);
  }
  return await command.run(options);
}
