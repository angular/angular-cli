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
import { ArchitectCommand } from '../../models/architect-command';
import { getArchitectTargetOptions } from '../../utilities/command-builder/architect-command-module';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
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

  run(options: Options<RunCommandArgs>): Promise<number | void> {
    const command = new ArchitectCommand(this.context, 'run', false, options.target);

    return command.validateAndRun(options);
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
