/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Argv } from 'yargs';
import {
  getAnalyticsInfoString,
  promptAnalytics,
  setAnalyticsConfig,
} from '../../../analytics/analytics';
import {
  CommandModule,
  CommandModuleImplementation,
  Options,
} from '../../../command-builder/command-module';

interface AnalyticsCommandArgs {
  global: boolean;
}

abstract class AnalyticsSettingModule
  extends CommandModule<AnalyticsCommandArgs>
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  longDescriptionPath?: string;

  builder(localYargs: Argv): Argv<AnalyticsCommandArgs> {
    return localYargs
      .option('global', {
        description: `Configure analytics gathering and reporting globally in the caller's home directory.`,
        alias: ['g'],
        type: 'boolean',
        default: false,
      })
      .strict();
  }

  abstract override run({ global }: Options<AnalyticsCommandArgs>): Promise<void>;
}

export class AnalyticsDisableModule
  extends AnalyticsSettingModule
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  command = 'disable';
  aliases = 'off';
  describe = 'Disables analytics gathering and reporting for the user.';

  async run({ global }: Options<AnalyticsCommandArgs>): Promise<void> {
    await setAnalyticsConfig(global, false);
    process.stderr.write(await getAnalyticsInfoString(this.context));
  }
}

export class AnalyticsEnableModule
  extends AnalyticsSettingModule
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  command = 'enable';
  aliases = 'on';
  describe = 'Enables analytics gathering and reporting for the user.';
  async run({ global }: Options<AnalyticsCommandArgs>): Promise<void> {
    await setAnalyticsConfig(global, true);
    process.stderr.write(await getAnalyticsInfoString(this.context));
  }
}

export class AnalyticsPromptModule
  extends AnalyticsSettingModule
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  command = 'prompt';
  describe = 'Prompts the user to set the analytics gathering status interactively.';

  async run({ global }: Options<AnalyticsCommandArgs>): Promise<void> {
    await promptAnalytics(this.context, global, true);
  }
}
