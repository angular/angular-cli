/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Target } from '@angular-devkit/architect';
import { Argv } from 'yargs';
import { Parser, hideBin } from 'yargs/helpers';
import { ArchitectCommand } from '../../models/architect-command';
import { getArchitectTargetOptions } from '../../utilities/command-builder/architect-command-module';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
} from '../../utilities/command-builder/command-module';
import { addSchemaOptionsToYargs } from '../../utilities/command-builder/json-schema';

const yargsParser = Parser as unknown as typeof Parser.default;

export interface RunCommandArgs {
  target: string;
}

interface ParsedFreeArgs {
  target: string;
  help: boolean;
}

export class RunCommandModule
  extends CommandModule<RunCommandArgs>
  implements CommandModuleImplementation<RunCommandArgs>
{
  static override scope = CommandScope.In;

  command = 'run <target>';
  describe =
    'Runs an Architect target with an optional custom builder configuration defined in your project.';

  async builder(argv: Argv): Promise<Argv<RunCommandArgs>> {
    const localYargs: Argv<RunCommandArgs> = argv
      .positional('target', {
        describe: 'The Architect target to run.',
        type: 'string',
        demandOption: true,
      })
      .strict();

    const workspace = this.context.workspace;
    if (!workspace) {
      return localYargs;
    }

    const target = this.makeTargetSpecifier();
    if (!target) {
      return localYargs;
    }

    const schemaOptions = await getArchitectTargetOptions(workspace, target);

    return schemaOptions
      ? addSchemaOptionsToYargs(localYargs, schemaOptions, this.parsedFreeArgs.help)
      : localYargs;
  }

  private _parsedFreeArgs: ParsedFreeArgs | undefined;
  private get parsedFreeArgs(): ParsedFreeArgs {
    if (this._parsedFreeArgs) {
      return this._parsedFreeArgs;
    }

    const {
      _: [_command, target = ''],
      help = false,
    } = yargsParser(hideBin(process.argv));

    return (this._parsedFreeArgs = {
      help,
      target,
    });
  }

  run(options: Options<RunCommandArgs>): Promise<number | void> {
    const command = new ArchitectCommand(this.context, 'run', false, options.target);

    return command.validateAndRun(options);
  }

  protected makeTargetSpecifier(options?: Options<RunCommandArgs>): Target | undefined {
    const architectTarget = options?.target ?? this.parsedFreeArgs.target;
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
