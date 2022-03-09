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
  promptGlobalAnalytics,
  promptProjectAnalytics,
  setAnalyticsConfig,
} from '../../analytics/analytics';
import { CommandModule, Options } from '../../command-builder/command-module';

interface AnalyticsCommandArgs {
  setting: 'on' | 'off' | 'prompt' | 'ci' | string;
  global: boolean;
}

export class AnalyticsCommandModule extends CommandModule<AnalyticsCommandArgs> {
  command = 'analytics <setting>';
  describe = 'Configures the gathering of Angular CLI usage metrics.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv<AnalyticsCommandArgs> {
    return localYargs
      .positional('setting', {
        description: 'Directly enables or disables all usage analytics for the user.',
        choices: ['on', 'off', 'ci', 'prompt'],
        type: 'string',
        demandOption: true,
      })
      .option('global', {
        description: `Access the global configuration in the caller's home directory.`,
        alias: ['g'],
        type: 'boolean',
        default: false,
      })
      .strict();
  }

  async run({ setting, global }: Options<AnalyticsCommandArgs>): Promise<void> {
    const level = global ? 'global' : 'local';
    switch (setting) {
      case 'off':
        setAnalyticsConfig(level, false);
        break;
      case 'on':
        setAnalyticsConfig(level, true);
        break;
      case 'ci':
        setAnalyticsConfig(level, 'ci');
        break;
      case 'prompt':
        if (global) {
          await promptGlobalAnalytics(true);
        } else {
          await promptProjectAnalytics(true);
        }
        break;
    }
  }
}
