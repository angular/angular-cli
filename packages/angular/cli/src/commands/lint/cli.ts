/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { MissingTargetChoice } from '../../command-builder/architect-base-command-module';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';

export default class LintCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  override missingTargetChoices: MissingTargetChoice[] = [
    {
      name: 'ESLint',
      value: 'angular-eslint',
    },
  ];

  multiTarget = true;
  command = 'lint [project]';
  longDescriptionPath = join(__dirname, 'long-description.md');
  describe = 'Runs linting tools on Angular application code in a given project folder.';
}
