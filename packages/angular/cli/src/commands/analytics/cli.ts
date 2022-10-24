/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join } from 'node:path';
import { Argv } from 'yargs';
import {
  CommandModule,
  CommandModuleImplementation,
  Options,
} from '../../command-builder/command-module';
import {
  addCommandModuleToYargs,
  demandCommandFailureMessage,
} from '../../command-builder/utilities/command';
import { AnalyticsInfoCommandModule } from './info/cli';
import {
  AnalyticsDisableModule,
  AnalyticsEnableModule,
  AnalyticsPromptModule,
} from './settings/cli';

export class AnalyticsCommandModule extends CommandModule implements CommandModuleImplementation {
  command = 'analytics';
  describe = 'Configures the gathering of Angular CLI usage metrics.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv {
    const subcommands = [
      AnalyticsInfoCommandModule,
      AnalyticsDisableModule,
      AnalyticsEnableModule,
      AnalyticsPromptModule,
    ].sort(); // sort by class name.

    for (const module of subcommands) {
      localYargs = addCommandModuleToYargs(localYargs, module, this.context);
    }

    return localYargs.demandCommand(1, demandCommandFailureMessage).strict();
  }

  run(_options: Options<{}>): void {}
}
