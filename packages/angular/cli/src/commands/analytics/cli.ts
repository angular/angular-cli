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
  'setting-or-project': 'on' | 'off' | 'ci' | 'project' | 'prompt' | string;
  'project-setting'?: 'on' | 'off' | 'prompt' | string;
}

export class AnalyticsCommandModule extends CommandModule<AnalyticsCommandArgs> {
  command = 'analytics <setting-or-project>';
  describe = 'Configures the gathering of Angular CLI usage metrics.';
  longDescriptionPath = join(__dirname, 'long-description.md');

  builder(localYargs: Argv): Argv<AnalyticsCommandArgs> {
    return localYargs
      .positional('setting-or-project', {
        description:
          'Directly enables or disables all usage analytics for the user, or prompts the user to set the status interactively, ' +
          'or sets the default status for the project.',
        choices: ['on', 'off', 'ci', 'prompt'],
        type: 'string',
        demandOption: true,
      })
      .positional('project-setting', {
        description: 'Sets the default analytics enablement status for the project.',
        choices: ['on', 'off', 'prompt'],
        type: 'string',
      })
      .strict();
  }

  async run({
    settingOrProject,
    projectSetting,
  }: Options<AnalyticsCommandArgs>): Promise<number | void> {
    if (settingOrProject === 'project' && projectSetting === undefined) {
      throw new Error(
        'Argument "project" requires a second argument of one of the following value: on, off.',
      );
    }

    switch (settingOrProject) {
      case 'off':
        setAnalyticsConfig('global', false);
        break;
      case 'on':
        setAnalyticsConfig('global', true);
        break;
      case 'ci':
        setAnalyticsConfig('global', 'ci');
        break;
      case 'project':
        switch (projectSetting) {
          case 'off':
            setAnalyticsConfig('local', false);
            break;
          case 'on':
            setAnalyticsConfig('local', true);
            break;
          case 'prompt':
            await promptProjectAnalytics(true);
            break;
        }
        break;
      case 'prompt':
        await promptGlobalAnalytics(true);
        break;
    }
  }
}
