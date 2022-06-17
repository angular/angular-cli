/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Target } from '@angular-devkit/architect';
import { join } from 'path';
import { Argv } from 'yargs';
import { ArchitectBaseCommandModule } from '../../command-builder/architect-base-command-module';
import {
  CommandModuleError,
  CommandModuleImplementation,
  CommandScope,
  Options,
  OtherOptions,
} from '../../command-builder/command-module';

export interface RunCommandArgs {
  target: string;
}

export class RunCommandModule
  extends ArchitectBaseCommandModule<RunCommandArgs>
  implements CommandModuleImplementation<RunCommandArgs>
{
  override scope = CommandScope.In;

  command = 'run <target>';
  describe =
    'Runs an Architect target with an optional custom builder configuration defined in your project.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  async builder(argv: Argv): Promise<Argv<RunCommandArgs>> {
    const { jsonHelp, getYargsCompletions, help } = this.context.args.options;

    const localYargs: Argv<RunCommandArgs> = argv
      .positional('target', {
        describe: 'The Architect target to run.',
        type: 'string',
        demandOption: true,
        // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
        // Also, hide choices from JSON help so that we don't display them in AIO.
        choices: (getYargsCompletions || help) && !jsonHelp ? this.getTargetChoices() : undefined,
      })
      .middleware((args) => {
        // TODO: remove in version 15.
        const { configuration, target } = args;
        if (typeof configuration === 'string' && target) {
          const targetWithConfig = target.split(':', 2);
          targetWithConfig.push(configuration);

          throw new CommandModuleError(
            'Unknown argument: configuration.\n' +
              `Provide the configuration as part of the target 'ng run ${targetWithConfig.join(
                ':',
              )}'.`,
          );
        }
      }, true)
      .strict();

    const target = this.makeTargetSpecifier();
    if (!target) {
      return localYargs;
    }

    const schemaOptions = await this.getArchitectTargetOptions(target);

    return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
  }

  async run(options: Options<RunCommandArgs> & OtherOptions): Promise<number> {
    const target = this.makeTargetSpecifier(options);
    const { target: _target, ...extraOptions } = options;

    if (!target) {
      throw new CommandModuleError('Cannot determine project or target.');
    }

    return this.runSingleTarget(target, extraOptions);
  }

  protected makeTargetSpecifier(options?: Options<RunCommandArgs>): Target | undefined {
    const architectTarget = options?.target ?? this.context.args.positional[1];
    if (!architectTarget) {
      return undefined;
    }

    const [project = '', target = '', configuration] = architectTarget.split(':');

    return {
      project,
      target,
      configuration,
    };
  }

  /** @returns a sorted list of target specifiers to be used for auto completion. */
  private getTargetChoices(): string[] | undefined {
    if (!this.context.workspace) {
      return;
    }

    const targets = [];
    for (const [projectName, project] of this.context.workspace.projects) {
      for (const [targetName, target] of project.targets) {
        const currentTarget = `${projectName}:${targetName}`;
        targets.push(currentTarget);

        if (!target.configurations) {
          continue;
        }

        for (const configName of Object.keys(target.configurations)) {
          targets.push(`${currentTarget}:${configName}`);
        }
      }
    }

    return targets.sort();
  }
}
