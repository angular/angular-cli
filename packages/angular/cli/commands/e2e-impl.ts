/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
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

  public async run(options: E2eCommandSchema & Arguments) {
    return this.runArchitectTarget(options);
  }
}
