/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';


export default class TestCommand extends ArchitectCommand {
  public readonly name = 'test';
  public readonly target = 'test';
  public readonly description = 'Run unit tests in existing project.';
  public static aliases = ['t'];
  public readonly scope = CommandScope.inProject;
  public readonly multiTarget = true;
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption,
  ];

  public async run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
