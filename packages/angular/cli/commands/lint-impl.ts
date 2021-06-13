/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as LintCommandSchema } from './lint';

const MissingBuilder = `
Cannot find "lint" target for the specified project.

You should add a package that implements linting capabilities.

For example:
  ng add @angular-eslint/schematics
`;

export class LintCommand extends ArchitectCommand<LintCommandSchema> {
  readonly target = 'lint';
  readonly multiTarget = true;
  readonly missingTargetError = MissingBuilder;

  async initialize(options: LintCommandSchema & Arguments): Promise<number | void> {
    if (!options.help) {
      return super.initialize(options);
    }
  }
}
