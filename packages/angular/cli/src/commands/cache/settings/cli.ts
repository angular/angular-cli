/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
} from '../../../command-builder/command-module';
import { updateCacheConfig } from '../utilities';

export class CacheDisableModule extends CommandModule implements CommandModuleImplementation {
  command = 'disable';
  aliases = 'off';
  describe = 'Disables persistent disk cache for all projects in the workspace.';
  longDescriptionPath: string | undefined;
  override scope = CommandScope.In;

  builder(localYargs: Argv): Argv {
    return localYargs;
  }

  run(): Promise<void> {
    return updateCacheConfig(this.getWorkspaceOrThrow(), 'enabled', false);
  }
}

export class CacheEnableModule extends CommandModule implements CommandModuleImplementation {
  command = 'enable';
  aliases = 'on';
  describe = 'Enables disk cache for all projects in the workspace.';
  longDescriptionPath: string | undefined;
  override scope = CommandScope.In;

  builder(localYargs: Argv): Argv {
    return localYargs;
  }

  run(): Promise<void> {
    return updateCacheConfig(this.getWorkspaceOrThrow(), 'enabled', true);
  }
}
