/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'path';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';

export class BuildCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = false;
  command = 'build [project]';
  aliases = ['b'];
  describe =
    'Compiles an Angular application or library into an output directory named dist/ at the given output path.';
  longDescriptionPath = join(__dirname, 'long-description.md');
}
