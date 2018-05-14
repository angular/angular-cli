import { logging, tags } from '@angular-devkit/core';
import { camelize } from '@angular-devkit/core/src/utils/strings';
import {
  ArgumentStrategy,
  CommandConstructor,
  CommandContext,
  CommandScope,
  Option,
} from '../models/command';
import { insideProject } from '../utilities/project';

import * as yargsParser from 'yargs-parser';


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
  const executionScope = insideProject()
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
    // Based off https://en.wikipedia.org/wiki/Levenshtein_distance
    // No optimization, really.
    function levenshtein(a: string, b: string): number {
      /* base case: empty strings */
      if (a.length == 0) {
        return b.length;
      }
      if (b.length == 0) {
        return a.length;
      }

      // Test if last characters of the strings match.
      const cost = a[a.length - 1] == b[b.length - 1] ? 0 : 1;

      /* return minimum of delete char from s, delete char from t, and delete char from both */
      return Math.min(
        levenshtein(a.slice(0, -1), b) + 1,
        levenshtein(a, b.slice(0, -1)) + 1,
        levenshtein(a.slice(0, -1), b.slice(0, -1)) + cost,
      );
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
    return command.printHelp(options);
  } else {
    if (command.scope !== undefined && command.scope !== CommandScope.everywhere) {
      if (command.scope !== executionScope) {
        let errorMessage;
        if (command.scope === CommandScope.inProject) {
          errorMessage = `This command can only be run inside of a CLI project.`;
        } else {
          errorMessage = `This command can not be run inside of a CLI project.`;
        }
        logger.fatal(errorMessage);

        return 1;
      }

      if (command.scope === CommandScope.inProject) {
        if (!context.project.configFile) {
          logger.fatal('Invalid project: missing workspace file.');

          return 1;
        }

        if (['.angular-cli.json', 'angular-cli.json'].includes(context.project.configFile)) {
          // --------------------------------------------------------------------------------
          // If changing this message, please update the same message in
          // `packages/@angular/cli/bin/ng-update-message.js`
          const message = tags.stripIndent`
            The Angular CLI configuration format has been changed, and your existing configuration
            can be updated automatically by running the following command:

              ng update @angular/cli
          `;

          logger.warn(message);

          return 1;
        }
      }
    }

    delete options.h;
    delete options.help;

    const isValid = await command.validate(options);
    if (!isValid) {
      logger.fatal(`Validation error. Invalid command`);

      return 1;
    }

    return await command.run(options);
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
    number: numbers,
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
