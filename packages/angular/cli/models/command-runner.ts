/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonParseMode,
  isJsonObject,
  json,
  logging,
  schema,
  strings,
  tags,
} from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { findUp } from '../utilities/find-up';
import { parseJsonSchemaToCommandDescription } from '../utilities/json-schema';
import { Command } from './command';
import {
  CommandDescription,
  CommandDescriptionMap,
  CommandWorkspace,
} from './interface';
import * as parser from './parser';


export interface CommandMapOptions {
  [key: string]: string;
}

/**
 * Run a command.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param workspace Workspace information.
 * @param commands The map of supported commands.
 */
export async function runCommand(
  args: string[],
  logger: logging.Logger,
  workspace: CommandWorkspace,
  commands?: CommandMapOptions,
): Promise<number | void> {
  if (commands === undefined) {
    const commandMapPath = findUp('commands.json', __dirname);
    if (commandMapPath === null) {
      throw new Error('Unable to find command map.');
    }
    const cliDir = dirname(commandMapPath);
    const commandsText = readFileSync(commandMapPath).toString('utf-8');
    const commandJson = json.parseJson(
      commandsText,
      JsonParseMode.Loose,
      { path: commandMapPath },
    );
    if (!isJsonObject(commandJson)) {
      throw Error('Invalid command.json');
    }

    commands = {};
    for (const commandName of Object.keys(commandJson)) {
      const commandValue = commandJson[commandName];
      if (typeof commandValue == 'string') {
        commands[commandName] = resolve(cliDir, commandValue);
      }
    }
  }

  // This registry is exclusively used for flattening schemas, and not for validating.
  const registry = new schema.CoreSchemaRegistry([]);
  registry.registerUriHandler((uri: string) => {
    if (uri.startsWith('ng-cli://')) {
      const content = readFileSync(join(__dirname, '..', uri.substr('ng-cli://'.length)), 'utf-8');

      return Promise.resolve(JSON.parse(content));
    } else {
      return null;
    }
  });

  // Normalize the commandMap
  const commandMap: CommandDescriptionMap = {};
  for (const name of Object.keys(commands)) {
    const schemaPath = commands[name];
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    const schema = json.parseJson(schemaContent, JsonParseMode.Loose, { path: schemaPath });
    if (!isJsonObject(schema)) {
      throw new Error('Invalid command JSON loaded from ' + JSON.stringify(schemaPath));
    }

    commandMap[name] =
      await parseJsonSchemaToCommandDescription(name, schemaPath, registry, schema);
  }

  let commandName: string | undefined = undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg in commandMap) {
      commandName = arg;
      args.splice(i, 1);
      break;
    } else if (!arg.startsWith('-')) {
      commandName = arg;
      args.splice(i, 1);
      break;
    }
  }

  // if no commands were found, use `help`.
  if (commandName === undefined) {
    if (args.length === 1 && args[0] === '--version') {
      commandName = 'version';
    } else {
      commandName = 'help';
    }
  }

  let description: CommandDescription | null = null;

  if (commandName !== undefined) {
    if (commandMap[commandName]) {
      description = commandMap[commandName];
    } else {
      Object.keys(commandMap).forEach(name => {
        const commandDescription = commandMap[name];
        const aliases = commandDescription.aliases;

        let found = false;
        if (aliases) {
          if (aliases.some(alias => alias === commandName)) {
            found = true;
          }
        }

        if (found) {
          if (description) {
            throw new Error('Found multiple commands with the same alias.');
          }
          commandName = name;
          description = commandDescription;
        }
      });
    }
  }

  if (!commandName) {
    logger.error(tags.stripIndent`
        We could not find a command from the arguments and the help command seems to be disabled.
        This is an issue with the CLI itself. If you see this comment, please report it and
        provide your repository.
      `);

    return 1;
  }

  if (!description) {
    const commandsDistance = {} as { [name: string]: number };
    const name = commandName;
    const allCommands = Object.keys(commandMap).sort((a, b) => {
      if (!(a in commandsDistance)) {
        commandsDistance[a] = strings.levenshtein(a, name);
      }
      if (!(b in commandsDistance)) {
        commandsDistance[b] = strings.levenshtein(b, name);
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

  try {
    const parsedOptions = parser.parseArguments(args, description.options);
    Command.setCommandMap(commandMap);
    const command = new description.impl({ workspace }, description, logger);

    return await command.validateAndRun(parsedOptions);
  } catch (e) {
    if (e instanceof parser.ParseArgumentException) {
      logger.fatal('Cannot parse arguments. See below for the reasons.');
      logger.fatal('    ' + e.comments.join('\n    '));

      return 1;
    } else {
      throw e;
    }
  }
}
