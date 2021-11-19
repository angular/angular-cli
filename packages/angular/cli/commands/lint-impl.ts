/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import { ArchitectCommand } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { askConfirmation } from '../utilities/prompt';
import { Schema as LintCommandSchema } from './lint';

const MissingBuilder = `
Cannot find "lint" target for the specified project.

You should add a package that implements linting capabilities.

For example:
  ng add @angular-eslint/schematics
`;

export class LintCommand extends ArchitectCommand<LintCommandSchema> {
  override readonly target = 'lint';
  override readonly multiTarget = true;

  override async initialize(options: LintCommandSchema & Arguments): Promise<number | void> {
    if (!options.help) {
      return super.initialize(options);
    }
  }

  override async onMissingTarget(): Promise<void | number> {
    this.logger.warn(MissingBuilder);

    const shouldAdd = await askConfirmation('Would you like to add ESLint now?', true, false);
    if (shouldAdd) {
      // Run `ng add @angular-eslint/schematics`
      const binPath = path.resolve(__dirname, '../bin/ng.js');
      const { status, error } = spawnSync(
        process.execPath,
        [binPath, 'add', '@angular-eslint/schematics'],
        {
          stdio: 'inherit',
        },
      );

      if (error) {
        throw error;
      }

      return status ?? 0;
    }
  }
}
