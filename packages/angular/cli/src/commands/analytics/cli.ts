/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore strict-deps: Markdown files are asset dependencies bundled/loaded at runtime
import longDescription from './long-description.md';
import {
  AnalyticsDisableModule,
  AnalyticsEnableModule,
  AnalyticsPromptModule,
} from './settings/cli';

export default class AnalyticsCommandModule
  extends CommandModule
  implements CommandModuleImplementation
{
  command = 'analytics';
  describe = 'Configures the gathering of Angular CLI usage metrics.';
  override longDescription = longDescription;

  builder(localYargs: Argv): Argv {
    const subcommands = [
      AnalyticsInfoCommandModule,
      AnalyticsDisableModule,
      AnalyticsEnableModule,
      AnalyticsPromptModule,
    ].sort(); // sort by class name.

    for (const module of subcommands) {
      addCommandModuleToYargs(module, this.context);
    }

    return localYargs.demandCommand(1, demandCommandFailureMessage).strict();
  }

  run(_options: Options<{}>): void {}
}
