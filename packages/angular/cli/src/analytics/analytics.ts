/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { analytics, json, tags } from '@angular-devkit/core';
import debug from 'debug';
import { v4 as uuidV4 } from 'uuid';
import { colors } from '../utilities/color';
import { getWorkspace, getWorkspaceRaw } from '../utilities/config';
import { analyticsDisabled, analyticsShareDisabled } from '../utilities/environment-options';
import { isTTY } from '../utilities/tty';
import { VERSION } from '../utilities/version';
import { AnalyticsCollector } from './analytics-collector';

/* eslint-disable no-console */
const analyticsDebug = debug('ng:analytics'); // Generate analytics, including settings and users.

let _defaultAngularCliPropertyCache: string;
export const AnalyticsProperties = {
  AngularCliProd: 'UA-8594346-29',
  AngularCliStaging: 'UA-8594346-32',
  get AngularCliDefault(): string {
    if (_defaultAngularCliPropertyCache) {
      return _defaultAngularCliPropertyCache;
    }

    const v = VERSION.full;
    // The logic is if it's a full version then we should use the prod GA property.
    _defaultAngularCliPropertyCache =
      /^\d+\.\d+\.\d+$/.test(v) && v !== '0.0.0'
        ? AnalyticsProperties.AngularCliProd
        : AnalyticsProperties.AngularCliStaging;

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
];

export function isPackageNameSafeForAnalytics(name: string): boolean {
  return analyticsPackageSafelist.some((pattern) => {
    if (typeof pattern == 'string') {
      return pattern === name;
    } else {
      return pattern.test(name);
    }
  });
}

/**
 * Set analytics settings. This does not work if the user is not inside a project.
 * @param global Which config to use. "global" for user-level, and "local" for project-level.
 * @param value Either a user ID, true to generate a new User ID, or false to disable analytics.
 */
export function setAnalyticsConfig(global: boolean, value: string | boolean): void {
  const level = global ? 'global' : 'local';
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
export async function promptAnalytics(global: boolean, force = false): Promise<boolean> {
  analyticsDebug('prompting user');
  const level = global ? 'global' : 'local';
  const [config, configPath] = getWorkspaceRaw(level);
  if (!config || !configPath) {
    throw new Error(`Could not find a ${level} workspace. Are you in a project?`);
  }

  if (force || isTTY()) {
    const { prompt } = await import('inquirer');
    const answers = await prompt<{ analytics: boolean }>([
      {
        type: 'confirm',
        name: 'analytics',
        message: tags.stripIndents`
          Would you like to share anonymous usage data about this project with the Angular Team at
          Google under Google’s Privacy Policy at https://policies.google.com/privacy. For more
          details and how to change this setting, see https://angular.io/analytics.

        `,
        default: false,
      },
    ]);

    setAnalyticsConfig(global, answers.analytics);

    if (answers.analytics) {
      console.log('');
      console.log(
        tags.stripIndent`
        Thank you for sharing anonymous usage data. Should you change your mind, the following
        command will disable this feature entirely:

            ${colors.yellow(`ng analytics disable${global ? ' --global' : ''}`)}
      `,
      );
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

    process.stderr.write(await getAnalyticsInfoString());

    return true;
  }

  return false;
}

/**
 * Get the analytics object for the user.
 *
 * @returns
 * - `AnalyticsCollector` when enabled.
 * - `analytics.NoopAnalytics` when disabled.
 * - `undefined` when not configured.
 */
export async function getAnalytics(
  level: 'local' | 'global',
): Promise<AnalyticsCollector | analytics.NoopAnalytics | undefined> {
  analyticsDebug('getAnalytics');

  if (analyticsDisabled) {
    analyticsDebug('NG_CLI_ANALYTICS is false');

    return new analytics.NoopAnalytics();
  }

  try {
    const workspace = await getWorkspace(level);
    const analyticsConfig: string | undefined | null | { uid?: string } =
      workspace?.getCli()['analytics'];
    analyticsDebug('Workspace Analytics config found: %j', analyticsConfig);

    if (analyticsConfig === false) {
      return new analytics.NoopAnalytics();
    } else if (analyticsConfig === undefined || analyticsConfig === null) {
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

  if (analyticsShareDisabled) {
    analyticsDebug('NG_CLI_ANALYTICS is false');

    return undefined;
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

export async function createAnalytics(
  workspace: boolean,
  skipPrompt = false,
): Promise<analytics.Analytics> {
  // Global config takes precedence over local config only for the disabled check.
  // IE:
  // global: disabled & local: enabled = disabled
  // global: id: 123 & local: id: 456 = 456

  // check global
  const globalConfig = await getAnalytics('global');
  if (globalConfig instanceof analytics.NoopAnalytics) {
    return globalConfig;
  }

  let config = globalConfig;
  // Not disabled globally, check locally or not set globally and command is run outside of workspace example: `ng new`
  if (workspace || globalConfig === undefined) {
    const level = workspace ? 'local' : 'global';
    let localOrGlobalConfig = await getAnalytics(level);
    if (localOrGlobalConfig === undefined) {
      if (!skipPrompt) {
        // config is unset, prompt user.
        // TODO: This should honor the `no-interactive` option.
        // It is currently not an `ng` option but rather only an option for specific commands.
        // The concept of `ng`-wide options are needed to cleanly handle this.
        await promptAnalytics(!workspace /** global */);
        localOrGlobalConfig = await getAnalytics(level);
      }
    }

    if (localOrGlobalConfig instanceof analytics.NoopAnalytics) {
      return localOrGlobalConfig;
    } else if (localOrGlobalConfig) {
      // Favor local settings over global when defined.
      config = localOrGlobalConfig;
    }
  }

  // Get shared analytics
  // TODO: evalute if this should be completly removed.
  const maybeSharedAnalytics = await getSharedAnalytics();
  if (config && maybeSharedAnalytics) {
    return new analytics.MultiAnalytics([config, maybeSharedAnalytics]);
  }

  return config ?? maybeSharedAnalytics ?? new analytics.NoopAnalytics();
}

function analyticsConfigValueToHumanFormat(value: unknown): 'enabled' | 'disabled' | 'not set' {
  if (value === false) {
    return 'disabled';
  } else if (typeof value === 'string' || value === true) {
    return 'enabled';
  } else {
    return 'not set';
  }
}

export async function getAnalyticsInfoString(): Promise<string> {
  const [globalWorkspace] = getWorkspaceRaw('global');
  const [localWorkspace] = getWorkspaceRaw('local');
  const globalSetting = globalWorkspace?.get(['cli', 'analytics']);
  const localSetting = localWorkspace?.get(['cli', 'analytics']);

  const analyticsInstance = await createAnalytics(
    !!localWorkspace /** workspace */,
    true /** skipPrompt */,
  );

  return (
    tags.stripIndents`
    Global setting: ${analyticsConfigValueToHumanFormat(globalSetting)}
    Local setting: ${
      localWorkspace
        ? analyticsConfigValueToHumanFormat(localSetting)
        : 'No local workspace configuration file.'
    }
    Effective status: ${
      analyticsInstance instanceof analytics.NoopAnalytics ? 'disabled' : 'enabled'
    }
  ` + '\n'
  );
}
