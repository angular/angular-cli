/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { json } from '@angular-devkit/core';
import { join } from 'path';
import { Argv } from 'yargs';
import { isPackageNameSafeForAnalytics } from '../../models/analytics';
import { getArchitectTargetOptions } from '../../utilities/command-builder/architect-command-module';
import {
  CommandModule,
  CommandModuleError,
  CommandModuleImplementation,
  CommandScope,
  Options,
  OtherOptions,
} from '../../utilities/command-builder/command-module';

export interface RunCommandArgs {
  target: string;
}

export class RunCommandModule
  extends CommandModule<RunCommandArgs>
  implements CommandModuleImplementation<RunCommandArgs>
{
  static override scope = CommandScope.In;

  command = 'run <target>';
  describe =
    'Runs an Architect target with an optional custom builder configuration defined in your project.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  async builder(argv: Argv): Promise<Argv<RunCommandArgs>> {
    const localYargs: Argv<RunCommandArgs> = argv
      .positional('target', {
        describe: 'The Architect target to run.',
        type: 'string',
        demandOption: true,
      })
      .strict();

    const target = this.makeTargetSpecifier();
    if (!target) {
      return localYargs;
    }

    const schemaOptions = await getArchitectTargetOptions(this.context, target);

    return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
  }

  async run(options: Options<RunCommandArgs> & OtherOptions): Promise<number | void> {
    const { logger, workspace } = this.context;
    if (!workspace) {
      throw new CommandModuleError('A workspace is required for this command.');
    }

    const registry = new json.schema.CoreSchemaRegistry();
    registry.addPostTransform(json.schema.transforms.addUndefinedDefaults);
    registry.useXDeprecatedProvider((msg) => logger.warn(msg));

    const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, workspace.basePath);
    const architect = new Architect(architectHost, registry);

    const target = this.makeTargetSpecifier(options);

    if (!target) {
      throw new CommandModuleError('Cannot determine project or target.');
    }

    const builderName = await architectHost.getBuilderNameForTarget(target);
    await this.reportAnalytics({
      ...(await architectHost.getOptionsForTarget(target)),
      ...options,
    });

    const { target: _target, ...extraOptions } = options;
    const run = await architect.scheduleTarget(target, extraOptions as json.JsonObject, {
      logger,
      analytics: isPackageNameSafeForAnalytics(builderName) ? await this.getAnalytics() : undefined,
    });

    const { error, success } = await run.output.toPromise();
    await run.stop();

    if (error) {
      logger.error(error);
    }

    return success ? 0 : 1;
  }

  protected makeTargetSpecifier(options?: Options<RunCommandArgs>): Target | undefined {
    const architectTarget = options?.target ?? this.context.args.positional[1];
    if (!architectTarget) {
      return undefined;
    }

    const [project = '', target = '', configuration = ''] = architectTarget.split(':');

    return {
      project,
      target,
      configuration,
    };
  }
}
