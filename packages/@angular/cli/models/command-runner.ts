import {
  Option,
  CommandContext,
  Command,
  CommandConstructor,
  CommandScope
} from '../models/command';
import { oneLine } from 'common-tags';
import { Logger } from '@angular-devkit/core/src/logger';
import { camelize } from '@angular-devkit/core/src/utils/strings';

const yargsParser = require('yargs-parser');

export interface CommandMap {
  [key: string]: CommandConstructor;
}

/**
 * Run a command.
 * @param commandMap Map of available commands.
 * @param args Raw unparsed arguments.
 * @param context Execution context.
 */
export async function runCommand(commandMap: CommandMap,
                           args: string[],
                           logger: Logger,
                           context: CommandContext): Promise<any> {

  const rawOptions = yargsParser(args, { alias: { help: ['h'] }, boolean: [ 'help' ] });
  let commandName = rawOptions._[0];
  // remove the command name
  rawOptions._ = rawOptions._.slice(1);
  const executionScope = context.project.isEmberCLIProject()
    ? CommandScope.inProject
    : CommandScope.outsideProject;

  let Cmd: CommandConstructor;
  Cmd = findCommand(commandMap, commandName);

  const versionAliases = ['-v', '--version'];
  if (!Cmd && versionAliases.indexOf(commandName) !== -1) {
    commandName = 'version';
    Cmd = findCommand(commandMap, commandName);
  }

  if (!Cmd && rawOptions.help) {
    commandName = 'help';
    Cmd = findCommand(commandMap, commandName);
  }

  if (!Cmd) {
    throw new Error(oneLine`The specified command (${commandName}) is invalid.
      For available options, see \`ng help\`.`);
  }

  const command = new Cmd(context, logger);

  let options = parseOptions(yargsParser, args, command.options);
  options = mapArguments(options, command.arguments);
  await command.initialize(options);
  options = parseOptions(yargsParser, args, command.options);
  options = mapArguments(options, command.arguments);
  if (commandName === 'help') {
    options.commandMap = commandMap;
  }

  if (options.help) {
    return await runHelp(command, options);
  } else {
    verifyCommandInScope(command, executionScope);
    delete options.h;
    delete options.help;
    return await validateAndRunCommand(command, options);
  }
}

function parseOptions(parser: Function,
                      args: string[],
                      cmdOpts: Option[]): any {
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
  // remove the command name
  parsedOptions._ = parsedOptions._.slice(1);

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

  return parsedOptions;
}

// Map arguments to options.
function mapArguments(options: any, args: string[]): any {
  const optsWithMappedArgs = {...options};
  optsWithMappedArgs._.forEach((value: string, index: number) => {
    // Remove the starting "<" and trailing ">".
    const arg = args[index];
    if (arg) {
      optsWithMappedArgs[arg] = value;
    }
  });

  delete optsWithMappedArgs._;

  return optsWithMappedArgs;
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
