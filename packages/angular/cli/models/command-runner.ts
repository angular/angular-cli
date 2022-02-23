/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import yargs from 'yargs';
import { AddCommandModule } from '../commands/add/cli';
import { AnalyticsCommandModule } from '../commands/analytics/cli';
import { BuildCommandModule } from '../commands/build/cli';
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
import { CommandContext, CommandScope } from '../utilities/command-builder/command-module';
import { AngularWorkspace } from '../utilities/config';

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
];

export async function runCommand(
  args: string[],
  logger: logging.Logger,
  workspace: AngularWorkspace | undefined,
): Promise<void> {
  const context: CommandContext = {
    workspace,
    logger,
    currentDirectory: process.cwd(),
    root: workspace?.basePath ?? process.cwd(),
  };

  let localYargs = yargs(args);
  for (const CommandModule of COMMANDS) {
    const scope = CommandModule.scope;
    if ((scope === CommandScope.In && !workspace) || (scope === CommandScope.Out && workspace)) {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commandModule = new CommandModule(context) as any;
    localYargs = localYargs.command({
      command: commandModule.command,
      aliases: commandModule.aliases,
      describe: commandModule.describe,
      deprecated: commandModule.deprecated,
      builder: (x) => commandModule.builder(x),
      handler: (x) => commandModule.handler(x),
    });
  }

  await localYargs
    .scriptName('ng')
    .parserConfiguration({
      'populate--': true,
      'unknown-options-as-args': false,
      'strip-aliased': true,
      'strip-dashed': true,
      'camel-case-expansion': true,
    })
    .demandCommand()
    .recommendCommands()
    .version(false)
    .help()
    .showHelpOnFail(false)
    .strict()
    .fail(false)
    .wrap(yargs.terminalWidth())
    .parseAsync();
}
