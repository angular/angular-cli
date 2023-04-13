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
import { RootCommands } from '../command-config';

export default class TestCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = true;
  command = 'test [project]';
  aliases = RootCommands['test'].aliases;
  describe = 'Runs unit tests in a project.';
  longDescriptionPath = join(__dirname, 'long-description.md');
}
