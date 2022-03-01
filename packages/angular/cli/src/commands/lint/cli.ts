/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { join } from 'path';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';

export class LintCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  override missingErrorTarget = tags.stripIndents`
  Cannot find "lint" target for the specified project.
  
  You should add a package that implements linting capabilities.
  
  For example:
    ng add @angular-eslint/schematics
  `;

  multiTarget = true;
  command = 'lint [project]';
  longDescriptionPath = join(__dirname, 'long-description.md');
  describe = 'Runs linting tools on Angular application code in a given project folder.';
}
