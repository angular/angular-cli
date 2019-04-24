/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  JsonParseMode,
  analytics,
  isJsonObject,
  json,
  logging,
  schema,
  strings,
  tags,
} from '@angular-devkit/core';
import * as debug from 'debug';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { parseJsonSchemaToCommandDescription } from '../utilities/json-schema';
import {
  getGlobalAnalytics,
  getSharedAnalytics,
  getWorkspaceAnalytics,
  hasWorkspaceAnalyticsConfiguration,
  promptProjectAnalytics,
} from './analytics';
import { Command } from './command';
import { CommandDescription, CommandWorkspace } from './interface';
import * as parser from './parser';

const analyticsDebug = debug('ng:analytics:commands');

// NOTE: Update commands.json if changing this.  It's still deep imported in one CI validation
const standardCommands = {
  'add': '../commands/add.json',
  'analytics': '../commands/analytics.json',
  'build': '../commands/build.json',
  'deploy': '../commands/deploy.json',
  'config': '../commands/config.json',
  'doc': '../commands/doc.json',
  'e2e': '../commands/e2e.json',
  'make-this-awesome': '../commands/easter-egg.json',
  'generate': '../commands/generate.json',
  'get': '../commands/deprecated.json',
  'set': '../commands/deprecated.json',
  'help': '../commands/help.json',
  'lint': '../commands/lint.json',
  'new': '../commands/new.json',
  'run': '../commands/run.json',
  'serve': '../commands/serve.json',
  'test': '../commands/test.json',
  'update': '../commands/update.json',
  'version': '../commands/version.json',
  'xi18n': '../commands/xi18n.json',
};

export interface CommandMapOptions {
  [key: string]: string;
}

/**
 * Create the analytics instance.
 * @private
 */
async function _createAnalytics(workspace: boolean): Promise<analytics.Analytics> {
  let config = await getGlobalAnalytics();
  // If in workspace and global analytics is enabled, defer to workspace level
  if (workspace && config) {
    // TODO: This should honor the `no-interactive` option.
    //       It is currently not an `ng` option but rather only an option for specific commands.
    //       The concept of `ng`-wide options are needed to cleanly handle this.
    if (!(await hasWorkspaceAnalyticsConfiguration())) {
      await promptProjectAnalytics();
    }
    config = await getWorkspaceAnalytics();
  }

  const maybeSharedAnalytics = await getSharedAnalytics();

  if (config && maybeSharedAnalytics) {
    return new analytics.MultiAnalytics([config, maybeSharedAnalytics]);
  } else if (config) {
    return config;
  } else if (maybeSharedAnalytics) {
    return maybeSharedAnalytics;
  } else {
    return new analytics.NoopAnalytics();
  }
}

async function loadCommandDescription(
  name: string,
  path: string,
  registry: json.schema.CoreSchemaRegistry,
): Promise<CommandDescription> {
  const schemaPath = resolve(__dirname, path);
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema = json.parseJson(schemaContent, JsonParseMode.Loose, { path: schemaPath });
  if (!isJsonObject(schema)) {
    throw new Error('Invalid command JSON loaded from ' + JSON.stringify(schemaPath));
  }

  return parseJsonSchemaToCommandDescription(name, schemaPath, registry, schema);
}

/**
 * Run a command.
 * @param args Raw unparsed arguments.
 * @param logger The logger to use.
 * @param workspace Workspace information.
 * @param commands The map of supported commands.
 * @param options Additional options.
 */
export async function runCommand(
  args: string[],
  logger: logging.Logger,
  workspace: CommandWorkspace,
  commands: CommandMapOptions = standardCommands,
  options: { analytics?: analytics.Analytics } = {},
): Promise<number | void> {
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

  let commandName: string | undefined = undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg.startsWith('-')) {
      commandName = arg;
      args.splice(i, 1);
      break;
    }
  }

  let description: CommandDescription | null = null;

  // if no commands were found, use `help`.
  if (!commandName) {
    if (args.length === 1 && args[0] === '--version') {
      commandName = 'version';
    } else {
      commandName = 'help';
    }

    if (!(commandName in commands)) {
      logger.error(tags.stripIndent`
          The "${commandName}" command seems to be disabled.
          This is an issue with the CLI itself. If you see this comment, please report it and
          provide your repository.
        `);

      return 1;
    }
  }

  if (commandName in commands) {
    description = await loadCommandDescription(commandName, commands[commandName], registry);
  } else {
    const commandNames = Object.keys(commands);

    // Optimize loading for common aliases
    if (commandName.length === 1) {
      commandNames.sort((a, b) => {
        const aMatch = a[0] === commandName;
        const bMatch = b[0] === commandName;
        if (aMatch && !bMatch) {
          return -1;
        } else if (!aMatch && bMatch) {
          return 1;
        } else {
          return 0;
        }
      });
    }

    for (const name of commandNames) {
      const aliasDesc = await loadCommandDescription(name, commands[name], registry);
      const aliases = aliasDesc.aliases;

      if (aliases && aliases.some(alias => alias === commandName)) {
        commandName = name;
        description = aliasDesc;
        break;
      }
    }
  }

  if (!description) {
    const commandsDistance = {} as { [name: string]: number };
    const name = commandName;
    const allCommands = Object.keys(commands).sort((a, b) => {
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
    const parsedOptions = parser.parseArguments(args, description.options, logger);
    Command.setCommandMap(async () => {
      const map: Record<string, CommandDescription> = {};
      for (const [name, path] of Object.entries(commands)) {
        map[name] = await loadCommandDescription(name, path, registry);
      }

      return map;
    });

    const analytics = options.analytics || await _createAnalytics(!!workspace.configFile);
    const context = { workspace, analytics };
    const command = new description.impl(context, description, logger);

    // Flush on an interval (if the event loop is waiting).
    let analyticsFlushPromise = Promise.resolve();
    setInterval(() => {
      analyticsFlushPromise = analyticsFlushPromise.then(() => analytics.flush());
    }, 1000);

    const result = await command.validateAndRun(parsedOptions);

    // Flush one last time.
    await analyticsFlushPromise.then(() => analytics.flush());

    return result;
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
