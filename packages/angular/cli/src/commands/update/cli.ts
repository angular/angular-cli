/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandScope,
  Options,
  OtherOptions,
} from '../../command-builder/command-module';
import { UpdateCommand } from './update-impl';

export interface UpdateCommandArgs {
  packages?: string | string[];
  force: boolean;
  next: boolean;
  'migrate-only'?: boolean;
  name?: string;
  from?: string;
  to?: string;
  'allow-dirty': boolean;
  verbose: boolean;
  'create-commits': boolean;
}

export class UpdateCommandModule extends CommandModule<UpdateCommandArgs> {
  static override scope = CommandScope.In;

  command = 'update [packages..]';
  describe = 'Updates your workspace and its dependencies. See https://update.angular.io/.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv<UpdateCommandArgs> {
    return localYargs
      .positional('packages', {
        description: 'The names of package(s) to update.',
        type: 'string',
      })
      .option('force', {
        description:
          'Ignore peer dependency version mismatches. ' +
          'Passes the `--force` flag to the package manager when installing packages.',
        type: 'boolean',
        default: false,
      })
      .option('next', {
        description: 'Use the prerelease version, including beta and RCs.',
        type: 'boolean',
        default: false,
      })
      .option('migrate-only', {
        description: 'Only perform a migration, do not update the installed version.',
        type: 'boolean',
      })
      .option('name', {
        description:
          'The name of the migration to run. ' +
          `Only available with a single package being updated, and only with 'migrate-only' option.`,
        type: 'string',
        implies: ['migrate-only'],
        conflicts: ['to', 'from'],
      })
      .option('from', {
        description:
          'Version from which to migrate from. ' +
          `Only available with a single package being updated, and only with 'migrate-only'.`,
        type: 'string',
        implies: ['to', 'migrate-only'],
        conflicts: ['name'],
      })
      .option('to', {
        describe:
          'Version up to which to apply migrations. Only available with a single package being updated, ' +
          `and only with 'migrate-only' option. Requires 'from' to be specified. Default to the installed version detected.`,
        type: 'string',
        implies: ['from', 'migrate-only'],
        conflicts: ['name'],
      })
      .option('allow-dirty', {
        describe:
          'Whether to allow updating when the repository contains modified or untracked files.',
        type: 'boolean',
        default: false,
      })
      .option('verbose', {
        describe: 'Display additional details about internal operations during execution.',
        type: 'boolean',
        default: false,
      })
      .option('create-commits', {
        describe: 'Create source control commits for updates and migrations.',
        type: 'boolean',
        alias: ['C'],
        default: false,
      })
      .strict();
  }

  run(options: Options<UpdateCommandArgs> & OtherOptions): Promise<number | void> {
    const command = new UpdateCommand(this.context, 'update');

    return command.validateAndRun(options);
  }
}
