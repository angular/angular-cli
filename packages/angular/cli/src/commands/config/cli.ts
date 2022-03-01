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
  CommandModuleImplementation,
  Options,
} from '../../command-builder/command-module';
import { ConfigCommand } from './config-impl';

export interface ConfigCommandArgs {
  'json-path': string;
  value?: string;
  global?: boolean;
}

export class ConfigCommandModule
  extends CommandModule<ConfigCommandArgs>
  implements CommandModuleImplementation<ConfigCommandArgs>
{
  command = 'config <json-path> [value]';
  describe =
    'Retrieves or sets Angular configuration values in the angular.json file for the workspace.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv<ConfigCommandArgs> {
    return localYargs
      .positional('json-path', {
        description:
          `The configuration key to set or query, in JSON path format. ` +
          `For example: "a[3].foo.bar[2]". If no new value is provided, returns the current value of this key.`,
        type: 'string',
        demandOption: true,
      })
      .positional('value', {
        description: 'If provided, a new value for the given configuration key.',
        type: 'string',
      })
      .option('global', {
        description: `Access the global configuration in the caller's home directory.`,
        alias: ['g'],
        type: 'boolean',
        default: false,
      })
      .strict();
  }

  run(options: Options<ConfigCommandArgs>): Promise<number | void> {
    const command = new ConfigCommand(this.context, 'config');

    return command.validateAndRun(options);
  }
}
