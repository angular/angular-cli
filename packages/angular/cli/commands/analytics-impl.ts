/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  promptGlobalAnalytics,
  promptProjectAnalytics,
  setAnalyticsConfig,
} from '../models/analytics';
import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { ProjectSetting, Schema as AnalyticsCommandSchema, SettingOrProject } from './analytics';


export class AnalyticsCommand extends Command<AnalyticsCommandSchema> {
  public async run(options: AnalyticsCommandSchema & Arguments) {
    // Our parser does not support positional enums (won't report invalid parameters). Do the
    // validation manually.
    // TODO(hansl): fix parser to better support positionals. This would be a breaking change.
    if (options.settingOrProject === undefined) {
      if (options['--']) {
        // The user passed positional arguments but they didn't validate.
        this.logger.error(`Argument ${JSON.stringify(options['--'][0])} is invalid.`);
        this.logger.error(`Please provide one of the following value: on, off, ci or project.`);

        return 1;
      } else {
        // No argument were passed.
        await this.printHelp(options);

        return 2;
      }
    } else if (options.settingOrProject == SettingOrProject.Project
               && options.projectSetting === undefined) {
      this.logger.error(`Argument ${JSON.stringify(options.settingOrProject)} requires a second `
                      + `argument of one of the following value: on, off.`);

      return 2;
    }

    try {
      switch (options.settingOrProject) {
        case SettingOrProject.Off:
          setAnalyticsConfig('global', false);
          break;

        case SettingOrProject.On:
          setAnalyticsConfig('global', true);
          break;

        case SettingOrProject.Ci:
          setAnalyticsConfig('global', 'ci');
          break;

        case SettingOrProject.Project:
          switch (options.projectSetting) {
            case ProjectSetting.Off:
              setAnalyticsConfig('local', false);
              break;

            case ProjectSetting.On:
              setAnalyticsConfig('local', true);
              break;

            case ProjectSetting.Prompt:
              await promptProjectAnalytics(true);
              break;

            default:
              await this.printHelp(options);

              return 3;
          }
          break;

        case SettingOrProject.Prompt:
          await promptGlobalAnalytics(true);
          break;

        default:
          await this.printHelp(options);

          return 4;
      }
    } catch (err) {
      this.logger.fatal(err.message);

      return 1;
    }

    return 0;
  }
}
