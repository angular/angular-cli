/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
} from '../../../command-builder/command-module';
import { colors } from '../../../utilities/color';
import { isCI } from '../../../utilities/environment-options';
import { getCacheConfig } from '../utilities';

export class CacheInfoCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'info';
  describe = 'Prints persistent disk cache configuration and statistics in the console.';
  longDescriptionPath?: string | undefined;
  override scope = CommandScope.In;

  builder(localYargs: Argv): Argv {
    return localYargs.strict();
  }

  async run(): Promise<void> {
    const cacheConfig = getCacheConfig(this.context.workspace);
    const { path, localPath, environment, enabled } = cacheConfig;

    const effectiveStatus = this.effectiveEnabledStatus(cacheConfig);

    // In a Git worktree, `path` is shared with the main checkout while `localPath` holds the
    // development server's Vite cache. Both are the same path outside of a worktree.
    const [sizeOnDisk, localSizeOnDisk] = await Promise.all([
      this.getSizeOfDirectory(path),
      localPath !== path ? this.getSizeOfDirectory(localPath) : undefined,
    ]);

    const info: { label: string; value: string }[] = [
      {
        label: 'Enabled',
        value: enabled ? colors.green('Yes') : colors.red('No'),
      },
      {
        label: 'Environment',
        value: colors.cyan(environment),
      },
      {
        label: 'Path',
        value: colors.cyan(path),
      },
      {
        label: 'Size on disk',
        value: colors.cyan(sizeOnDisk),
      },
    ];

    if (localSizeOnDisk !== undefined) {
      info.push(
        {
          label: 'Local path',
          value: colors.cyan(localPath),
        },
        {
          label: 'Local size on disk',
          value: colors.cyan(localSizeOnDisk),
        },
      );
    }

    info.push({
      label: 'Effective Status',
      value:
        (effectiveStatus ? colors.green('Enabled') : colors.red('Disabled')) + ' (current machine)',
    });

    const maxLabelLength = Math.max(...info.map((l) => l.label.length));

    const output = info
      .map(({ label, value }) => colors.bold(label.padEnd(maxLabelLength + 2)) + `: ${value}`)
      .join('\n');

    this.context.logger.info(`\n${colors.bold('Cache Information')}\n\n${output}\n`);
  }

  private async getSizeOfDirectory(path: string): Promise<string> {
    const directoriesStack = [path];
    let size = 0;

    while (directoriesStack.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const dirPath = directoriesStack.pop()!;
      let entries: string[] = [];

      try {
        entries = await fs.readdir(dirPath);
      } catch {}

      for (const entry of entries) {
        const entryPath = join(dirPath, entry);
        const stats = await fs.stat(entryPath);

        if (stats.isDirectory()) {
          directoriesStack.push(entryPath);
        }

        size += stats.size;
      }
    }

    return this.formatSize(size);
  }

  private formatSize(size: number): string {
    if (size <= 0) {
      return '0 bytes';
    }

    const abbreviations = ['bytes', 'kB', 'MB', 'GB'];
    const index = Math.floor(Math.log(size) / Math.log(1024));
    const roundedSize = size / Math.pow(1024, index);
    // bytes don't have a fraction
    const fractionDigits = index === 0 ? 0 : 2;

    return `${roundedSize.toFixed(fractionDigits)} ${abbreviations[index]}`;
  }

  private effectiveEnabledStatus(cacheConfig: { enabled: boolean; environment: string }): boolean {
    const { enabled, environment } = cacheConfig;

    if (enabled) {
      switch (environment) {
        case 'ci':
          return isCI;
        case 'local':
          return !isCI;
      }
    }

    return enabled;
  }
}
