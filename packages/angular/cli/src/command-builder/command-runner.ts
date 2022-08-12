/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import yargs from 'yargs';
import { Parser } from 'yargs/helpers';
import { AddCommandModule } from '../commands/add/cli';
import { AnalyticsCommandModule } from '../commands/analytics/cli';
import { BuildCommandModule } from '../commands/build/cli';
import { CacheCommandModule } from '../commands/cache/cli';
import { CompletionCommandModule } from '../commands/completion/cli';
import { ConfigCommandModule } from '../commands/config/cli';
import { DeployCommandModule } from '../commands/deploy/cli';
import { DocCommandModule } from '../commands/doc/cli';
import { E2eCommandModule } from '../commands/e2e/cli';
import { ExtractI18nCommandModule } from '../commands/extract-i18n/cli';
import { GenerateCommandModule } from '../commands/generate/cli';
import { LintCommandModule } from '../commands/lint/cli';
import { AwesomeCommandModule } from '../commands/make-this-awesome/cli';
import { NewCommandModule } from '../commands/new/cli';
import { RunCommandModule } from '../commands/run/cli';
import { ServeCommandModule } from '../commands/serve/cli';
import { TestCommandModule } from '../commands/test/cli';
import { UpdateCommandModule } from '../commands/update/cli';
import { VersionCommandModule } from '../commands/version/cli';
import { colors } from '../utilities/color';
import { AngularWorkspace, getWorkspace } from '../utilities/config';
import { assertIsError } from '../utilities/error';
import { PackageManagerUtils } from '../utilities/package-manager';
import { CommandContext, CommandModuleError } from './command-module';
import { addCommandModuleToYargs, demandCommandFailureMessage } from './utilities/command';
import { jsonHelpUsage } from './utilities/json-help';
import { normalizeOptionsMiddleware } from './utilities/normalize-options-middleware';

const COMMANDS = [
  VersionCommandModule,
  DocCommandModule,
  AwesomeCommandModule,
  ConfigCommandModule,
  AnalyticsCommandModule,
  AddCommandModule,
  GenerateCommandModule,
  BuildCommandModule,
  E2eCommandModule,
  TestCommandModule,
  ServeCommandModule,
  ExtractI18nCommandModule,
  DeployCommandModule,
  LintCommandModule,
  NewCommandModule,
  UpdateCommandModule,
  RunCommandModule,
  CacheCommandModule,
  CompletionCommandModule,
].sort(); // Will be sorted by class name.

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
  const context: CommandContext = {
    globalConfiguration,
    workspace,
    logger,
    currentDirectory: process.cwd(),
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

  let localYargs = yargs(args);
  for (const CommandModule of COMMANDS) {
    localYargs = addCommandModuleToYargs(localYargs, CommandModule, context);
  }

  if (jsonHelp) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageInstance = (localYargs as any).getInternalMethods().getUsageInstance();
    usageInstance.help = () => jsonHelpUsage();
  }

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
    .epilogue('For more information, see https://angular.io/cli/.\n')
    .demandCommand(1, demandCommandFailureMessage)
    .recommendCommands()
    .middleware(normalizeOptionsMiddleware)
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
    .wrap(yargs.terminalWidth())
    .parseAsync();

  return process.exitCode ?? 0;
}
