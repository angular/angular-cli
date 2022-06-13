/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
} from '../../../command-builder/command-module';
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
    const { path, environment, enabled } = getCacheConfig(this.context.workspace);

    this.context.logger.info(tags.stripIndents`
      Enabled: ${enabled ? 'yes' : 'no'}
      Environment: ${environment}
      Path: ${path}
      Size on disk: ${await this.getSizeOfDirectory(path)}
      Effective status on current machine: ${this.effectiveEnabledStatus() ? 'enabled' : 'disabled'}
    `);
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

  private effectiveEnabledStatus(): boolean {
    const { enabled, environment } = getCacheConfig(this.context.workspace);

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
