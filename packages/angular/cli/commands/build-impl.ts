/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Version } from '../upgrade/version';

export class BuildCommand extends ArchitectCommand {
  public readonly target = 'build';

  public validate(options: ArchitectCommandOptions) {
    // Check Angular and TypeScript versions.
    Version.assertCompatibleAngularVersion(this.project.root);
    Version.assertTypescriptVersion(this.project.root);

    return super.validate(options);
  }

  public async run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
