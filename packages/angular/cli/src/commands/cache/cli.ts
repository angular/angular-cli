/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
} from '../../command-builder/command-module';
import {
  addCommandModuleToYargs,
  demandCommandFailureMessage,
} from '../../command-builder/utilities/command';
import { CacheCleanModule } from './clean/cli';
import { CacheInfoCommandModule } from './info/cli';
import { CacheDisableModule, CacheEnableModule } from './settings/cli';

export class CacheCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'cache';
  describe = 'Configure persistent disk cache and retrieve cache statistics.';
  longDescriptionPath = join(__dirname, 'long-description.md');
  override scope = CommandScope.In;

  builder(localYargs: Argv): Argv {
    const subcommands = [
      CacheEnableModule,
      CacheDisableModule,
      CacheCleanModule,
      CacheInfoCommandModule,
    ].sort();

    for (const module of subcommands) {
      localYargs = addCommandModuleToYargs(localYargs, module, this.context);
    }

    return localYargs.demandCommand(1, demandCommandFailureMessage).strict();
  }

  run(_options: Options<{}>): void {}
}
