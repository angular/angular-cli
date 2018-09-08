/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as RunCommandSchema } from './run';

export class RunCommand extends ArchitectCommand<RunCommandSchema> {
  public async run(options: ArchitectCommandOptions & Arguments) {
    if (options.target) {
      return this.runArchitectTarget(options);
    } else {
      throw new Error('Invalid architect target.');
    }
  }
}
