/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join } from 'node:path';
import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';
import { RootCommands } from '../command-config';

export default class BuildCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = false;
  command = 'build [project]';
  aliases = RootCommands['build'].aliases;
  describe =
    'Compiles an Angular application or library into an output directory named dist/ at the given output path.';
  longDescriptionPath = join(__dirname, 'long-description.md');
}
