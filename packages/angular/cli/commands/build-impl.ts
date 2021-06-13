/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as BuildCommandSchema } from './build';

export class BuildCommand extends ArchitectCommand<BuildCommandSchema> {
  public override readonly target = 'build';

  public override async run(options: ArchitectCommandOptions & Arguments) {
    return this.runArchitectTarget(options);
  }
}
