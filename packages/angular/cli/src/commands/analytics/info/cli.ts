/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Argv } from 'yargs';
import { getAnalyticsInfoString } from '../../../analytics/analytics';
import {
  CommandModule,
  CommandModuleImplementation,
  Options,
} from '../../../command-builder/command-module';

export class AnalyticsInfoCommandModule
  extends CommandModule
  implements CommandModuleImplementation
{
  command = 'info';
  describe = 'Prints analytics gathering and reporting configuration in the console.';
  longDescriptionPath?: string;

  builder(localYargs: Argv): Argv {
    return localYargs.strict();
  }

  async run(_options: Options<{}>): Promise<void> {
    this.context.logger.info(await getAnalyticsInfoString(this.context));
  }
}
