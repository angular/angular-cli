/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';
import { RootCommands } from '../command-config';
import longDescription from './long-description.md';

export default class TestCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = true;
  command = 'test [project]';
  aliases = RootCommands['test'].aliases;
  describe = 'Runs unit tests in a project.';
  override longDescription = longDescription;
}
