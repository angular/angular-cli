/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import yargs from 'yargs';
import { Parser } from 'yargs/helpers';
import {
  CommandConfig,
  CommandNames,
  RootCommands,
  RootCommandsAliases,
} from '../commands/command-config';
import { colors } from '../utilities/color';
import { AngularWorkspace, getWorkspace } from '../utilities/config';
import { assertIsError } from '../utilities/error';
import { PackageManagerUtils } from '../utilities/package-manager';
import { VERSION } from '../utilities/version';
import { CommandContext, CommandModuleError } from './command-module';
import {
  CommandModuleConstructor,
  addCommandModuleToYargs,
  demandCommandFailureMessage,
} from './utilities/command';
import { jsonHelpUsage } from './utilities/json-help';
import { createNormalizeOptionsMiddleware } from './utilities/normalize-options-middleware';

const yargsParser = Parser as unknown as typeof Parser.default;

export async function runCommand(args: string[], logger: logging.Logger): Promise<number> {
  const {
    $0,
    _,
    help = false,
    jsonHelp = false,
    getYargsCompletions = false,
    ...rest
  } = yargsParser(args, {
    boolean: ['help', 'json-help', 'get-yargs-completions'],
    alias: { 'collection': 'c' },
  });

  // When `getYargsCompletions` is true the scriptName 'ng' at index 0 is not removed.
  const positional = getYargsCompletions ? _.slice(1) : _;

  let workspace: AngularWorkspace | undefined;
  let globalConfiguration: AngularWorkspace;
  try {
    [workspace, globalConfiguration] = await Promise.all([
      getWorkspace('local'),
      getWorkspace('global'),
    ]);
  } catch (e) {
    assertIsError(e);
    logger.fatal(e.message);

    return 1;
  }

  const root = workspace?.basePath ?? process.cwd();
  const localYargs = yargs(args);

  const context: CommandContext = {
    globalConfiguration,
    workspace,
    logger,
    currentDirectory: process.cwd(),
    yargsInstance: localYargs,
    root,
    packageManager: new PackageManagerUtils({ globalConfiguration, workspace, root }),
    args: {
      positional: positional.map((v) => v.toString()),
      options: {
        help,
        jsonHelp,
        getYargsCompletions,
        ...rest,
      },
    },
  };

  for (const CommandModule of await getCommandsToRegister(positional[0])) {
    addCommandModuleToYargs(CommandModule, context);
  }

  if (jsonHelp) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageInstance = (localYargs as any).getInternalMethods().getUsageInstance();
    usageInstance.help = () => jsonHelpUsage(localYargs);
  }

  // Add default command to support version option when no subcommand is specified
  localYargs.command('*', false, (builder) =>
    builder.version('version', 'Show Angular CLI version.', VERSION.full),
  );

  await localYargs
    .scriptName('ng')
    // https://github.com/yargs/yargs/blob/main/docs/advanced.md#customizing-yargs-parser
    .parserConfiguration({
      'populate--': true,
      'unknown-options-as-args': false,
      'dot-notation': false,
      'boolean-negation': true,
      'strip-aliased': true,
      'strip-dashed': true,
      'camel-case-expansion': false,
    })
    .option('json-help', {
      describe: 'Show help in JSON format.',
      implies: ['help'],
      hidden: true,
      type: 'boolean',
    })
    .help('help', 'Shows a help message for this command in the console.')
    // A complete list of strings can be found: https://github.com/yargs/yargs/blob/main/locales/en.json
    .updateStrings({
      'Commands:': colors.cyan('Commands:'),
      'Options:': colors.cyan('Options:'),
      'Positionals:': colors.cyan('Arguments:'),
      'deprecated': colors.yellow('deprecated'),
      'deprecated: %s': colors.yellow('deprecated:') + ' %s',
      'Did you mean %s?': 'Unknown command. Did you mean %s?',
    })
    .epilogue('For more information, see https://angular.dev/cli/.\n')
    .demandCommand(1, demandCommandFailureMessage)
    .recommendCommands()
    .middleware(createNormalizeOptionsMiddleware(localYargs))
    .version(false)
    .showHelpOnFail(false)
    .strict()
    .fail((msg, err) => {
      throw msg
        ? // Validation failed example: `Unknown argument:`
          new CommandModuleError(msg)
        : // Unknown exception, re-throw.
          err;
    })
    .wrap(localYargs.terminalWidth())
    .parseAsync();

  return +(process.exitCode ?? 0);
}

/**
 * Get the commands that need to be registered.
 * @returns One or more command factories that needs to be registered.
 */
async function getCommandsToRegister(
  commandName: string | number,
): Promise<CommandModuleConstructor[]> {
  const commands: CommandConfig[] = [];
  if (commandName in RootCommands) {
    commands.push(RootCommands[commandName as CommandNames]);
  } else if (commandName in RootCommandsAliases) {
    commands.push(RootCommandsAliases[commandName]);
  } else {
    // Unknown command, register every possible command.
    Object.values(RootCommands).forEach((c) => commands.push(c));
  }

  return Promise.all(commands.map((command) => command.factory().then((m) => m.default)));
}
