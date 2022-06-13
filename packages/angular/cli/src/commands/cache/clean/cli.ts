/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { promises as fs } from 'fs';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
} from '../../../command-builder/command-module';
import { getCacheConfig } from '../utilities';

export class CacheCleanModule extends CommandModule implements CommandModuleImplementation {
  command = 'clean';
  describe = 'Deletes persistent disk cache from disk.';
  longDescriptionPath: string | undefined;
  override scope = CommandScope.In;

  builder(localYargs: Argv): Argv {
    return localYargs.strict();
  }

  run(): Promise<void> {
    const { path } = getCacheConfig(this.context.workspace);

    return fs.rm(path, {
      force: true,
      recursive: true,
      maxRetries: 3,
    });
  }
}
