/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Version } from '../upgrade/version';
import { Schema as ServeCommandSchema } from './serve';

export class ServeCommand extends ArchitectCommand<ServeCommandSchema> {
  public readonly target = 'serve';

  public validate(_options: ArchitectCommandOptions & Arguments) {
    // Check Angular and TypeScript versions.
    Version.assertCompatibleAngularVersion(this.workspace.root);
    Version.assertTypescriptVersion(this.workspace.root);

    return true;
  }

  public async run(options: ArchitectCommandOptions & Arguments) {
    return this.runArchitectTarget(options);
  }
}
