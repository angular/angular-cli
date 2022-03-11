/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { Argv } from 'yargs';
import { analyticsConfigValueToHumanFormat, createAnalytics } from '../../../analytics/analytics';
import {
  CommandModule,
  CommandModuleImplementation,
  Options,
} from '../../../command-builder/command-module';
import { getWorkspaceRaw } from '../../../utilities/config';

export class AnalyticsInfoCommandModule
  extends CommandModule
  implements CommandModuleImplementation
{
  command = 'info';
  describe = 'Prints analytics gathering and reporting configuration in the console.';
  longDescriptionPath?: string | undefined;

  builder(localYargs: Argv): Argv {
    return localYargs.strict();
  }

  async run(_options: Options<{}>): Promise<void> {
    const [globalWorkspace] = getWorkspaceRaw('global');
    const [localWorkspace] = getWorkspaceRaw('local');
    const globalSetting = globalWorkspace?.get(['cli', 'analytics']);
    const localSetting = localWorkspace?.get(['cli', 'analytics']);

    const effectiveSetting = await createAnalytics(
      !!this.context.workspace /** workspace */,
      true /** skipPrompt */,
    );

    this.context.logger.info(tags.stripIndents`
      Global setting: ${analyticsConfigValueToHumanFormat(globalSetting)}
      Local setting: ${
        this.context.workspace
          ? analyticsConfigValueToHumanFormat(localSetting)
          : 'No local workspace configuration file.'
      }
      Effective status: ${effectiveSetting ? 'enabled' : 'disabled'}
    `);
  }
}
