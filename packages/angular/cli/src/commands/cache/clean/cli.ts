/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { rm } from 'node:fs/promises';
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
  override scope = CommandScope.In;

  builder(localYargs: Argv): Argv {
    return localYargs.strict();
  }

  async run(): Promise<void> {
    const { path, localPath } = getCacheConfig(this.context.workspace);

    // In a Git worktree, `path` is shared with the main checkout and `localPath` holds the
    // development server's Vite cache. Both are the same path outside of a worktree.
    await Promise.all(
      Array.from(new Set([path, localPath]), (cachePath) =>
        rm(cachePath, {
          force: true,
          recursive: true,
          maxRetries: 3,
        }),
      ),
    );
  }
}
