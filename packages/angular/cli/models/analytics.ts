/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json, tags } from '@angular-devkit/core';
import * as debug from 'debug';
import * as inquirer from 'inquirer';
import { v4 as uuidV4 } from 'uuid';
import { colors } from '../utilities/color';
import { getWorkspace, getWorkspaceRaw } from '../utilities/config';
import { isTTY } from '../utilities/tty';
import { AnalyticsCollector } from './analytics-collector';

// tslint:disable: no-console
const analyticsDebug = debug('ng:analytics'); // Generate analytics, including settings and users.

let _defaultAngularCliPropertyCache: string;
export const AnalyticsProperties = {
  AngularCliProd: 'UA-8594346-29',
  AngularCliStaging: 'UA-8594346-32',
  get AngularCliDefault(): string {
    if (_defaultAngularCliPropertyCache) {
      return _defaultAngularCliPropertyCache;
    }

    const v = require('../package.json').version;

    // The logic is if it's a full version then we should use the prod GA property.
    if (/^\d+\.\d+\.\d+$/.test(v) && v !== '0.0.0') {
      _defaultAngularCliPropertyCache = AnalyticsProperties.AngularCliProd;
    } else {
      _defaultAngularCliPropertyCache = AnalyticsProperties.AngularCliStaging;
    }

    return _defaultAngularCliPropertyCache;
  },
};

/**
 * This is the ultimate safelist for checking if a package name is safe to report to analytics.
 */
export const analyticsPackageSafelist = [
  /^@angular\//,
  /^@angular-devkit\//,
  /^@ngtools\//,
  '@schematics/angular',
  '@schematics/schematics',
];

export function isPackageNameSafeForAnalytics(name: string): boolean {
  return analyticsPackageSafelist.some(pattern => {
    if (typeof pattern == 'string') {
      return pattern === name;
    } else {
      return pattern.test(name);
    }
  });
}

/**
 * Set analytics settings. This does not work if the user is not inside a project.
 * @param level Which config to use. "global" for user-level, and "local" for project-level.
 * @param value Either a user ID, true to generate a new User ID, or false to disable analytics.
 */
export function setAnalyticsConfig(level: 'global' | 'local', value: string | boolean) {
  analyticsDebug('setting %s level analytics to: %s', level, value);
  const [config, configPath] = getWorkspaceRaw(level);
  if (!config || !configPath) {
    throw new Error(`Could not find ${level} workspace.`);
  }

  const cli = config.get(['cli']);

  if (cli !== undefined && !json.isJsonObject(cli as json.JsonValue)) {
    throw new Error(`Invalid config found at ${configPath}. CLI should be an object.`);
  }

  if (value === true) {
    value = uuidV4();
  }

  config.modify(['cli', 'analytics'], value);
  config.save();

  analyticsDebug('done');

}

/**
 * Prompt the user for usage gathering permission.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
export async function promptGlobalAnalytics(force = false) {
  analyticsDebug('prompting global analytics.');
  if (force || isTTY()) {
    const answers = await inquirer.prompt<{ analytics: boolean }>([
      {
        type: 'confirm',
        name: 'analytics',
        message: tags.stripIndents`
          Would you like to share anonymous usage data with the Angular Team at Google under
          Google’s Privacy Policy at https://policies.google.com/privacy? For more details and
          how to change this setting, see https://angular.io/analytics.
        `,
        default: false,
      },
    ]);

    setAnalyticsConfig('global', answers.analytics);

    if (answers.analytics) {
      console.log('');
      console.log(tags.stripIndent`
        Thank you for sharing anonymous usage data. If you change your mind, the following
        command will disable this feature entirely:

            ${colors.yellow('ng analytics off')}
      `);
      console.log('');

      // Send back a ping with the user `optin`.
      const ua = new AnalyticsCollector(AnalyticsProperties.AngularCliDefault, 'optin');
      ua.pageview('/telemetry/optin');
      await ua.flush();
    } else {
      // Send back a ping with the user `optout`. This is the only thing we send.
      const ua = new AnalyticsCollector(AnalyticsProperties.AngularCliDefault, 'optout');
      ua.pageview('/telemetry/optout');
      await ua.flush();
    }

    return true;
  } else {
    analyticsDebug('Either STDOUT or STDIN are not TTY and we skipped the prompt.');
  }

  return false;
}

/**
 * Prompt the user for usage gathering permission for the local project. Fails if there is no
 * local workspace.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
export async function promptProjectAnalytics(force = false): Promise<boolean> {
  analyticsDebug('prompting user');
  const [config, configPath] = getWorkspaceRaw('local');
  if (!config || !configPath) {
    throw new Error(`Could not find a local workspace. Are you in a project?`);
  }

  if (force || isTTY()) {
    const answers = await inquirer.prompt<{ analytics: boolean }>([
      {
        type: 'confirm',
        name: 'analytics',
        message: tags.stripIndents`
          Would you like to share anonymous usage data about this project with the Angular Team at
          Google under Google’s Privacy Policy at https://policies.google.com/privacy? For more
          details and how to change this setting, see https://angular.io/analytics.

        `,
        default: false,
      },
    ]);

    setAnalyticsConfig('local', answers.analytics);

    if (answers.analytics) {
      console.log('');
      console.log(tags.stripIndent`
        Thank you for sharing anonymous usage data. Would you change your mind, the following
        command will disable this feature entirely:

            ${colors.yellow('ng analytics project off')}
      `);
      console.log('');

      // Send back a ping with the user `optin`.
      const ua = new AnalyticsCollector(AnalyticsProperties.AngularCliDefault, 'optin');
      ua.pageview('/telemetry/project/optin');
      await ua.flush();
    } else {
      // Send back a ping with the user `optout`. This is the only thing we send.
      const ua = new AnalyticsCollector(AnalyticsProperties.AngularCliDefault, 'optout');
      ua.pageview('/telemetry/project/optout');
      await ua.flush();
    }

    return true;
  }

  return false;
}

export async function hasGlobalAnalyticsConfiguration(): Promise<boolean> {
  try {
    const globalWorkspace = await getWorkspace('global');
    const analyticsConfig: string | undefined | null | { uid?: string } =
      globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analytics'];

    if (analyticsConfig !== null && analyticsConfig !== undefined) {
      return true;
    }
  } catch { }

  return false;
}

/**
 * Get the global analytics object for the user. This returns an instance of UniversalAnalytics,
 * or undefined if analytics are disabled.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
export async function getGlobalAnalytics(): Promise<AnalyticsCollector | undefined> {
  analyticsDebug('getGlobalAnalytics');
  const propertyId = AnalyticsProperties.AngularCliDefault;

  if ('NG_CLI_ANALYTICS' in process.env) {
    if (process.env['NG_CLI_ANALYTICS'] == 'false' || process.env['NG_CLI_ANALYTICS'] == '') {
      analyticsDebug('NG_CLI_ANALYTICS is false');

      return undefined;
    }
    if (process.env['NG_CLI_ANALYTICS'] === 'ci') {
      analyticsDebug('Running in CI mode');

      return new AnalyticsCollector(propertyId, 'ci');
    }
  }

  // If anything happens we just keep the NOOP analytics.
  try {
    const globalWorkspace = await getWorkspace('global');
    const analyticsConfig: string | undefined | null | { uid?: string } =
      globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analytics'];
    analyticsDebug('Client Analytics config found: %j', analyticsConfig);

    if (analyticsConfig === false) {
      analyticsDebug('Analytics disabled. Ignoring all analytics.');

      return undefined;
    } else if (analyticsConfig === undefined || analyticsConfig === null) {
      analyticsDebug('Analytics settings not found. Ignoring all analytics.');

      // globalWorkspace can be null if there is no file. analyticsConfig would be null in this
      // case. Since there is no file, the user hasn't answered and the expected return value is
      // undefined.
      return undefined;
    } else {
      let uid: string | undefined = undefined;
      if (typeof analyticsConfig == 'string') {
        uid = analyticsConfig;
      } else if (typeof analyticsConfig == 'object' && typeof analyticsConfig['uid'] == 'string') {
        uid = analyticsConfig['uid'];
      }

      analyticsDebug('client id: %j', uid);
      if (uid == undefined) {
        return undefined;
      }

      return new AnalyticsCollector(propertyId, uid);
    }
  } catch (err) {
    analyticsDebug('Error happened during reading of analytics config: %s', err.message);

    return undefined;
  }
}

export async function hasWorkspaceAnalyticsConfiguration(): Promise<boolean> {
  try {
    const globalWorkspace = await getWorkspace('local');
    const analyticsConfig: string | undefined | null | { uid?: string } = globalWorkspace
      && globalWorkspace.getCli()
      && globalWorkspace.getCli()['analytics'];

    if (analyticsConfig !== undefined) {
      return true;
    }
  } catch { }

  return false;
}

/**
 * Get the workspace analytics object for the user. This returns an instance of AnalyticsCollector,
 * or undefined if analytics are disabled.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
export async function getWorkspaceAnalytics(): Promise<AnalyticsCollector | undefined> {
  analyticsDebug('getWorkspaceAnalytics');
  try {
    const globalWorkspace = await getWorkspace('local');
    const analyticsConfig: string | undefined | null | { uid?: string } = globalWorkspace?.getCli()['analytics'];
    analyticsDebug('Workspace Analytics config found: %j', analyticsConfig);

    if (analyticsConfig === false) {
      analyticsDebug('Analytics disabled. Ignoring all analytics.');

      return undefined;
    } else if (analyticsConfig === undefined || analyticsConfig === null) {
      analyticsDebug('Analytics settings not found. Ignoring all analytics.');

      return undefined;
    } else {
      let uid: string | undefined = undefined;
      if (typeof analyticsConfig == 'string') {
        uid = analyticsConfig;
      } else if (typeof analyticsConfig == 'object' && typeof analyticsConfig['uid'] == 'string') {
        uid = analyticsConfig['uid'];
      }

      analyticsDebug('client id: %j', uid);
      if (uid == undefined) {
        return undefined;
      }

      return new AnalyticsCollector(AnalyticsProperties.AngularCliDefault, uid);
    }
  } catch (err) {
    analyticsDebug('Error happened during reading of analytics config: %s', err.message);

    return undefined;
  }

}

/**
 * Return the usage analytics sharing setting, which is either a property string (GA-XXXXXXX-XX),
 * or undefined if no sharing.
 */
export async function getSharedAnalytics(): Promise<AnalyticsCollector | undefined> {
  analyticsDebug('getSharedAnalytics');

  const envVarName = 'NG_CLI_ANALYTICS_SHARE';
  if (envVarName in process.env) {
    if (process.env[envVarName] == 'false' || process.env[envVarName] == '') {
      analyticsDebug('NG_CLI_ANALYTICS is false');

      return undefined;
    }
  }

  // If anything happens we just keep the NOOP analytics.
  try {
    const globalWorkspace = await getWorkspace('global');
    const analyticsConfig = globalWorkspace?.getCli()['analyticsSharing'];

    if (!analyticsConfig || !analyticsConfig.tracking || !analyticsConfig.uuid) {
      return undefined;
    } else {
      analyticsDebug('Analytics sharing info: %j', analyticsConfig);

      return new AnalyticsCollector(analyticsConfig.tracking, analyticsConfig.uuid);
    }
  } catch (err) {
    analyticsDebug('Error happened during reading of analytics sharing config: %s', err.message);

    return undefined;
  }
}
