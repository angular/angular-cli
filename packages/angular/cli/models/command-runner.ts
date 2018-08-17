/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-global-tslint-disable no-any
import {
  JsonObject,
  deepCopy,
  logging,
  parseJson,
  schema,
  strings as coreStrings,
  tags,
} from '@angular-devkit/core';
import { ExportStringRef } from '@angular-devkit/schematics/tools';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { of, throwError } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import * as yargsParser from 'yargs-parser';
import {
  Command,
  CommandConstructor,
  CommandContext,
  CommandScope,
  Option,
} from '../models/command';
import { findUp } from '../utilities/find-up';
import { insideProject } from '../utilities/project';
import { convertSchemaToOptions, parseSchema } from './json-schema';


interface CommandMap {
  [key: string]: string;
}

interface CommandMetadata {
  description: string;
  $aliases?: string[];
  $impl: string;
  $scope?: 'in' | 'out';
  $type?: 'architect' | 'schematic';
  $hidden?: boolean;
}

interface CommandLocation {
  path: string;
  text: string;
  rawData: CommandMetadata;
}

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

/**
 * Run a command.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param context Execution context.
 */
export async function runCommand(
  args: string[],
  logger: logging.Logger,
  context: CommandContext,
  commandMap?: CommandMap,
): Promise<number | void> {

  // if not args supplied, just run the help command.
  if (!args || args.length === 0) {
    args = ['help'];
  }
  const rawOptions = yargsParser(args, { alias: { help: ['h'] }, boolean: [ 'help' ] });
  let commandName = rawOptions._[0] || '';

  // remove the command name
  rawOptions._ = rawOptions._.slice(1);
  const executionScope = insideProject()
    ? CommandScope.inProject
    : CommandScope.outsideProject;

  if (commandMap === undefined) {
    const commandMapPath = findUp('commands.json', __dirname);
    if (commandMapPath === null) {
      logger.fatal('Unable to find command map.');

      return 1;
    }
    const cliDir = dirname(commandMapPath);
    const commandsText = readFileSync(commandMapPath).toString('utf-8');
    const commandJson = JSON.parse(commandsText) as { [name: string]: string };

    commandMap = {};
    for (const commandName of Object.keys(commandJson)) {
      commandMap[commandName] = join(cliDir, commandJson[commandName]);
    }
  }

  let commandMetadata = commandName ? findCommand(commandMap, commandName) : null;

  if (!commandMetadata && (rawOptions.v || rawOptions.version)) {
    commandName = 'version';
    commandMetadata = findCommand(commandMap, commandName);
  } else if (!commandMetadata && rawOptions.help) {
    commandName = 'help';
    commandMetadata = findCommand(commandMap, commandName);
  }

  if (!commandMetadata) {
    if (!commandName) {
      logger.error(tags.stripIndent`
        We could not find a command from the arguments and the help command seems to be disabled.
        This is an issue with the CLI itself. If you see this comment, please report it and
        provide your repository.
      `);

      return 1;
    } else {
      const commandsDistance = {} as { [name: string]: number };
      const allCommands = Object.keys(commandMap).sort((a, b) => {
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
  }

  const command = await createCommand(commandMetadata, context, logger);
  const metadataOptions = await convertSchemaToOptions(commandMetadata.text);
  if (command === null) {
    logger.error(tags.stripIndent`Command (${commandName}) failed to instantiate.`);

    return 1;
  }
  // Add the options from the metadata to the command object.
  command.addOptions(metadataOptions);
  let options = parseOptions(args, metadataOptions);
  args = await command.initializeRaw(args);

  const optionsCopy = deepCopy(options);
  await processRegistry(optionsCopy, commandMetadata);
  await command.initialize(optionsCopy);

  // Reparse options after initializing the command.
  options = parseOptions(args, command.options);

  if (commandName === 'help') {
    options.commandInfo = getAllCommandInfo(commandMap);
  }

  if (options.help) {
    command.printHelp(commandName, commandMetadata.rawData.description, options);

    return;
  } else {
    const commandScope = mapCommandScope(commandMetadata.rawData.$scope);
    if (commandScope !== undefined && commandScope !== CommandScope.everywhere) {
      if (commandScope !== executionScope) {
        let errorMessage;
        if (commandScope === CommandScope.inProject) {
          errorMessage = `This command can only be run inside of a CLI project.`;
        } else {
          errorMessage = `This command can not be run inside of a CLI project.`;
        }
        logger.fatal(errorMessage);

        return 1;
      }
      if (commandScope === CommandScope.inProject) {
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
  }
  delete options.h;
  delete options.help;
  await processRegistry(options, commandMetadata);

  const isValid = await command.validate(options);
  if (!isValid) {
    logger.fatal(`Validation error. Invalid command options.`);

    return 1;
  }

  return command.run(options);
}

async function processRegistry(
  options: {_: (string | boolean | number)[]}, commandMetadata: CommandLocation) {
  const rawArgs = options._;
  const registry = new schema.CoreSchemaRegistry([]);
  registry.addSmartDefaultProvider('argv', (schema: JsonObject) => {
    if ('index' in schema) {
      return rawArgs[Number(schema['index'])];
    } else {
      return rawArgs;
    }
  });

  const jsonSchema = parseSchema(commandMetadata.text);
  if (jsonSchema === null) {
    throw new Error('');
  }
  await registry.compile(jsonSchema).pipe(
    concatMap(validator => validator(options)), concatMap(validatorResult => {
      if (validatorResult.success) {
        return of(options);
      } else {
        return throwError(new schema.SchemaValidationException(validatorResult.errors));
      }
    })).toPromise();
}

export function parseOptions(args: string[], optionsAndArguments: Option[]) {
  const parser = yargsParser;

  // filter out arguments
  const options = optionsAndArguments
    .filter(opt => {
      let isOption = true;
      if (opt.$default !== undefined && opt.$default.$source === 'argv') {
        isOption = false;
      }

      return isOption;
    });

  const aliases: { [key: string]: string[]; } = options
    .reduce((aliases: { [key: string]: string; }, opt) => {
      if (!opt || !opt.aliases || opt.aliases.length === 0) {
        return aliases;
      }

      aliases[opt.name] = (opt.aliases || [])
        .filter(a => a.length === 1)[0];

      return aliases;
    }, {});

  const booleans = options
    .filter(o => o.type && o.type === 'boolean')
    .map(o => o.name);

  const defaults = options
    .filter(o => o.default !== undefined || booleans.indexOf(o.name) !== -1)
    .reduce((defaults: {[key: string]: string | number | boolean | undefined }, opt: Option) => {
      defaults[opt.name] = opt.default;

      return defaults;
    }, {});

  const strings = options
    .filter(o => o.type === 'string')
    .map(o => o.name);

  const numbers = options
    .filter(o => o.type === 'number')
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
  options
    .reduce((allAliases, option) => {
      if (!option || !option.aliases || option.aliases.length === 0) {
        return allAliases;
      }

      return allAliases.concat([...option.aliases]);
    }, [] as string[])
    .forEach((alias: string) => {
      delete parsedOptions[alias];
    });

  // Remove undefined booleans
  booleans
    .filter(b => parsedOptions[b] === undefined)
    .map(b => coreStrings.camelize(b))
    .forEach(b => delete parsedOptions[b]);

  // remove options with dashes.
  Object.keys(parsedOptions)
    .filter(key => key.indexOf('-') !== -1)
    .forEach(key => delete parsedOptions[key]);

  // remove the command name
  parsedOptions._ = parsedOptions._.slice(1);

  return parsedOptions;
}

// Find a command.
function findCommand(map: CommandMap, name: string): CommandLocation | null {
  // let Cmd: CommandConstructor = map[name];
  let commandName = name;

  if (!map[commandName]) {
    // find command via aliases
    commandName = Object.keys(map)
      .filter(key => {
        // get aliases for the key
        const metadataText = readFileSync(map[key]).toString('utf-8');
        const metadata = JSON.parse(metadataText);
        const aliases = metadata['$aliases'];
        if (!aliases) {
          return false;
        }
        const foundAlias = aliases.filter((alias: string) => alias === name);

        return foundAlias.length > 0;
      })[0];
  }

  const metadataPath = map[commandName];

  if (!metadataPath) {
    return null;
  }
  const metadataText = readFileSync(metadataPath).toString('utf-8');

  const metadata = parseJson(metadataText) as any;

  return {
    path: metadataPath,
    text: metadataText,
    rawData: metadata,
  };
}

// Create an instance of a command.
async function createCommand(metadata: CommandLocation,
                             context: CommandContext,
                             logger: logging.Logger): Promise<Command | null> {
  const schema = parseSchema(metadata.text);
  if (schema === null) {
    return null;
  }
  const implPath = schema.$impl;
  if (typeof implPath !== 'string') {
    throw new Error('Implementation path is incorrect');
  }

  const implRef = new ExportStringRef(implPath, dirname(metadata.path));

  const ctor = implRef.ref as CommandConstructor;

  return new ctor(context, logger);
}

function mapCommandScope(scope: 'in' | 'out' | undefined): CommandScope {
  let commandScope = CommandScope.everywhere;
  switch (scope) {
    case 'in':
      commandScope = CommandScope.inProject;
      break;
    case 'out':
      commandScope = CommandScope.outsideProject;
      break;
  }

  return commandScope;
}

interface CommandInfo {
  name: string;
  description: string;
  aliases: string[];
  hidden: boolean;
}
function getAllCommandInfo(map: CommandMap): CommandInfo[] {
  return Object.keys(map)
    .map(name => {
      return {
        name: name,
        metadata: findCommand(map, name),
      };
    })
    .map(info => {
      if (info.metadata === null) {
        return null;
      }

      return {
        name: info.name,
        description: info.metadata.rawData.description,
        aliases: info.metadata.rawData.$aliases || [],
        hidden: info.metadata.rawData.$hidden || false,
      };
    })
    .filter(info => info !== null) as CommandInfo[];
}
