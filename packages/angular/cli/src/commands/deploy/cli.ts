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

export class DeployCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  override missingErrorTarget = tags.stripIndents`
  Cannot find "deploy" target for the specified project.

  You should add a package that implements deployment capabilities for your
  favorite platform.
  
  For example:
    ng add @angular/fire
    ng add @azure/ng-deploy
  
  Find more packages on npm https://www.npmjs.com/search?q=ng%20deploy
  `;

  multiTarget = false;
  command = 'deploy [project]';
  longDescriptionPath = join(__dirname, 'long-description.md');
  describe =
    'Invokes the deploy builder for a specified project or for the default project in the workspace.';
}
