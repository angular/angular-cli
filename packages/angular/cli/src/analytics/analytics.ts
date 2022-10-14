/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { json, tags } from '@angular-devkit/core';
import { randomUUID } from 'crypto';
import type { CommandContext } from '../command-builder/command-module';
import { colors } from '../utilities/color';
import { getWorkspace } from '../utilities/config';
import { analyticsDisabled } from '../utilities/environment-options';
import { isTTY } from '../utilities/tty';

/* eslint-disable no-console */

/**
 * This is the ultimate safelist for checking if a package name is safe to report to analytics.
 */
export const analyticsPackageSafelist = [
  /^@angular\//,
  /^@angular-devkit\//,
  /^@nguniversal\//,
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
export async function setAnalyticsConfig(global: boolean, value: string | boolean): Promise<void> {
  const level = global ? 'global' : 'local';
  const workspace = await getWorkspace(level);
  if (!workspace) {
    throw new Error(`Could not find ${level} workspace.`);
  }

  const cli = (workspace.extensions['cli'] ??= {});
  if (!workspace || !json.isJsonObject(cli)) {
    throw new Error(`Invalid config found at ${workspace.filePath}. CLI should be an object.`);
  }

  cli.analytics = value === true ? randomUUID() : value;
  await workspace.save();
}

/**
 * Prompt the user for usage gathering permission.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
export async function promptAnalytics(
  context: CommandContext,
  global: boolean,
  force = false,
): Promise<boolean> {
  const level = global ? 'global' : 'local';
  const workspace = await getWorkspace(level);
  if (!workspace) {
    throw new Error(`Could not find a ${level} workspace. Are you in a project?`);
  }

  if (force || isTTY()) {
    const { prompt } = await import('inquirer');
    const answers = await prompt<{ analytics: boolean }>([
      {
        type: 'confirm',
        name: 'analytics',
        message: tags.stripIndents`
           Would you like to share pseudonymous usage data about this project with the Angular Team
           at Google under Google's Privacy Policy at https://policies.google.com/privacy. For more
           details and how to change this setting, see https://angular.io/analytics.

         `,
        default: false,
      },
    ]);

    await setAnalyticsConfig(global, answers.analytics);

    if (answers.analytics) {
      console.log('');
      console.log(
        tags.stripIndent`
         Thank you for sharing pseudonymous usage data. Should you change your mind, the following
         command will disable this feature entirely:

             ${colors.yellow(`ng analytics disable${global ? ' --global' : ''}`)}
       `,
      );
      console.log('');
    }

    process.stderr.write(await getAnalyticsInfoString(context));

    return true;
  }

  return false;
}

/**
 * Get the analytics user id.
 *
 * @returns
 * - `string` user id.
 * - `false` when disabled.
 * - `undefined` when not configured.
 */
async function getAnalyticsUserIdForLevel(
  level: 'local' | 'global',
): Promise<string | false | undefined> {
  if (analyticsDisabled) {
    return false;
  }

  const workspace = await getWorkspace(level);
  const analyticsConfig: string | undefined | null | { uid?: string } =
    workspace?.getCli()?.['analytics'];

  if (analyticsConfig === false) {
    return false;
  } else if (analyticsConfig === undefined || analyticsConfig === null) {
    return undefined;
  } else {
    if (typeof analyticsConfig == 'string') {
      return analyticsConfig;
    } else if (typeof analyticsConfig == 'object' && typeof analyticsConfig['uid'] == 'string') {
      return analyticsConfig['uid'];
    }

    return undefined;
  }
}

export async function getAnalyticsUserId(
  context: CommandContext,
  skipPrompt = false,
): Promise<string | undefined> {
  const { workspace } = context;
  // Global config takes precedence over local config only for the disabled check.
  // IE:
  // global: disabled & local: enabled = disabled
  // global: id: 123 & local: id: 456 = 456

  // check global
  const globalConfig = await getAnalyticsUserIdForLevel('global');
  if (globalConfig === false) {
    return undefined;
  }

  // Not disabled globally, check locally or not set globally and command is run outside of workspace example: `ng new`
  if (workspace || globalConfig === undefined) {
    const level = workspace ? 'local' : 'global';
    let localOrGlobalConfig = await getAnalyticsUserIdForLevel(level);
    if (localOrGlobalConfig === undefined) {
      if (!skipPrompt) {
        // config is unset, prompt user.
        // TODO: This should honor the `no-interactive` option.
        // It is currently not an `ng` option but rather only an option for specific commands.
        // The concept of `ng`-wide options are needed to cleanly handle this.
        await promptAnalytics(context, !workspace /** global */);
        localOrGlobalConfig = await getAnalyticsUserIdForLevel(level);
      }
    }

    if (localOrGlobalConfig === false) {
      return undefined;
    } else if (typeof localOrGlobalConfig === 'string') {
      return localOrGlobalConfig;
    }
  }

  return globalConfig;
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

export async function getAnalyticsInfoString(context: CommandContext): Promise<string> {
  const analyticsInstance = await getAnalyticsUserId(context, true /** skipPrompt */);

  const { globalConfiguration, workspace: localWorkspace } = context;
  const globalSetting = globalConfiguration?.getCli()?.['analytics'];
  const localSetting = localWorkspace?.getCli()?.['analytics'];

  return (
    tags.stripIndents`
     Global setting: ${analyticsConfigValueToHumanFormat(globalSetting)}
     Local setting: ${
       localWorkspace
         ? analyticsConfigValueToHumanFormat(localSetting)
         : 'No local workspace configuration file.'
     }
     Effective status: ${analyticsInstance ? 'enabled' : 'disabled'}
   ` + '\n'
  );
}
