/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';


export class Xi18nCommand extends ArchitectCommand {
  public readonly name = 'xi18n';
  public readonly target = 'extract-i18n';
  public readonly description = 'Extracts i18n messages from source code.';
  public static scope = CommandScope.inProject;
  public static aliases = [];
  public readonly multiTarget: true;
  public readonly options: Option[] = [
    this.configurationOption,
  ];

  public async run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
