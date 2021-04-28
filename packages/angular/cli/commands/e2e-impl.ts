/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ArchitectCommand } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as E2eCommandSchema } from './e2e';

export class E2eCommand extends ArchitectCommand<E2eCommandSchema> {
  public readonly target = 'e2e';
  public readonly multiTarget = true;
  public readonly missingTargetError = `
Cannot find "e2e" target for the specified project.

You should add a package that implements end-to-end testing capabilities.

For example:
  WebdriverIO: ng add @wdio/schematics

More options will be added to the list as they become available.
`;

  async initialize(options: E2eCommandSchema & Arguments) {
    if (!options.help) {
      return super.initialize(options);
    }
  }
}
