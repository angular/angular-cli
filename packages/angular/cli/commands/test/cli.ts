/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommandModule } from '../../utilities/command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../utilities/command-builder/command-module';

export class TestCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = true;
  command = 'test [project]';
  aliases = ['t'];
  describe = 'Runs unit tests in a project.';
}
