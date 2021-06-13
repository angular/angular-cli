/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as ServeCommandSchema } from './serve';

export class ServeCommand extends ArchitectCommand<ServeCommandSchema> {
  public override readonly target = 'serve';

  public validate() {
    return true;
  }

  public override async run(options: ArchitectCommandOptions & Arguments) {
    return this.runArchitectTarget(options);
  }
}
