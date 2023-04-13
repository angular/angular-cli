/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ArchitectCommandModule } from '../../command-builder/architect-command-module';
import { CommandModuleImplementation } from '../../command-builder/command-module';
import { RootCommands } from '../command-config';

export default class ServeCommandModule
  extends ArchitectCommandModule
  implements CommandModuleImplementation
{
  multiTarget = false;
  command = 'serve [project]';
  aliases = RootCommands['serve'].aliases;
  describe = 'Builds and serves your application, rebuilding on file changes.';
  longDescriptionPath?: string | undefined;
}
