/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Argv } from 'yargs';
import {
  promptGlobalAnalytics,
  promptProjectAnalytics,
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
  longDescriptionPath?: string | undefined;

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

  abstract override run({ global }: Options<AnalyticsCommandArgs>): void;
}

export class AnalyticsOffModule
  extends AnalyticsSettingModule
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  command = 'off';
  describe = 'Disables analytics gathering and reporting for the user.';

  run({ global }: Options<AnalyticsCommandArgs>): void {
    setAnalyticsConfig(global, false);
  }
}

export class AnalyticsOnModule
  extends AnalyticsSettingModule
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  command = 'on';
  describe = 'Enables analytics gathering and reporting for the user.';
  run({ global }: Options<AnalyticsCommandArgs>): void {
    setAnalyticsConfig(global, true);
  }
}

export class AnalyticsCIModule
  extends AnalyticsSettingModule
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  command = 'ci';
  describe =
    'Enables analytics and configures reporting for use with Continuous Integration, which uses a common CI user.';

  run({ global }: Options<AnalyticsCommandArgs>): void {
    setAnalyticsConfig(global, 'ci');
  }
}

export class AnalyticsPromptModule
  extends AnalyticsSettingModule
  implements CommandModuleImplementation<AnalyticsCommandArgs>
{
  command = 'prompt';
  describe = 'Prompts the user to set the analytics gathering status interactively.';

  async run({ global }: Options<AnalyticsCommandArgs>): Promise<void> {
    if (global) {
      await promptGlobalAnalytics(true);
    } else {
      await promptProjectAnalytics(true);
    }
  }
}
