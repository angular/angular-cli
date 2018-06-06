/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';
import { Version } from '../upgrade/version';

export default class BuildCommand extends ArchitectCommand {
  public readonly name = 'build';
  public readonly target = 'build';
  public readonly description =
    'Builds your app and places it into the output path (dist/ by default).';
  public static aliases = ['b'];
  public scope = CommandScope.inProject;
  public options: Option[] = [
    this.prodOption,
    this.configurationOption,
  ];

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
