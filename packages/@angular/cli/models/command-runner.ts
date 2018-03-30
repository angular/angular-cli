import {
  Option,
  CommandContext,
  Command,
  CommandConstructor,
  CommandScope,
  ArgumentStrategy
} from '../models/command';
import { oneLine } from 'common-tags';
import { logging } from '@angular-devkit/core';
import { camelize } from '@angular-devkit/core/src/utils/strings';

import * as yargsParser from 'yargs-parser';
import * as fs from 'fs';
import { join } from 'path';

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
                                 context: CommandContext): Promise<any> {

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
    logger.error(oneLine`The specified command (${commandName}) is invalid.
    For a list of available options, run \`ng help\`.`);
    throw '';
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
    verifyWorkspace(command, executionScope, context.project.root);
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

  aliases.help = ['h'];
  booleans.push('help');

  const yargsOptions = {
    alias: aliases,
    boolean: booleans,
    default: defaults
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
function findCommand(
  map: CommandMap, name: string): CommandConstructor | null {
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
      throw new Error(errorMessage);
    }
  }
}

function verifyWorkspace(command: Command, executionScope: CommandScope, root: string): void {
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
    throw new Error('Invalid project: missing workspace file.');
  }
}

// Execute a command's `printHelp`.
async function runHelp(command: Command, options: any): Promise<void> {
  return await command.printHelp(options);
}

// Validate and run a command.
async function validateAndRunCommand(command: Command, options: any): Promise<any> {
  const isValid = await command.validate(options);
  if (isValid !== undefined && !isValid) {
    throw new Error(`Validation error. Invalid command`);
  }
  return await command.run(options);
}
