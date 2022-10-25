/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import 'symbol-observable';
// symbol polyfill must go first
import { promises as fs } from 'fs';
import { createRequire } from 'module';
import * as path from 'path';
import { SemVer, major } from 'semver';
import { colors } from '../src/utilities/color';
import { isWarningEnabled } from '../src/utilities/config';
import { disableVersionCheck } from '../src/utilities/environment-options';
import { VERSION } from '../src/utilities/version';

/**
 * Angular CLI versions prior to v14 may not exit correctly if not forcibly exited
 * via `process.exit()`. When bootstrapping, `forceExit` will be set to `true`
 * if the local CLI version is less than v14 to prevent the CLI from hanging on
 * exit in those cases.
 */
let forceExit = false;

(async (): Promise<typeof import('./cli').default | null> => {
  /**
   * Disable Browserslist old data warning as otherwise with every release we'd need to update this dependency
   * which is cumbersome considering we pin versions and the warning is not user actionable.
   * `Browserslist: caniuse-lite is outdated. Please run next command `npm update`
   * See: https://github.com/browserslist/browserslist/blob/819c4337456996d19db6ba953014579329e9c6e1/node.js#L324
   */
  process.env.BROWSERSLIST_IGNORE_OLD_DATA = '1';

  /**
   * Disable CLI version mismatch checks and forces usage of the invoked CLI
   * instead of invoking the local installed version.
   */
  if (disableVersionCheck) {
    return (await import('./cli')).default;
  }

  let cli;
  const rawCommandName = process.argv[2];

  try {
    // No error implies a projectLocalCli, which will load whatever
    // version of ng-cli you have installed in a local package.json
    const cwdRequire = createRequire(process.cwd() + '/');
    const projectLocalCli = cwdRequire.resolve('@angular/cli');
    cli = await import(projectLocalCli);

    const globalVersion = new SemVer(VERSION.full);

    // Older versions might not have the VERSION export
    let localVersion = cli.VERSION?.full;
    if (!localVersion) {
      try {
        const localPackageJson = await fs.readFile(
          path.join(path.dirname(projectLocalCli), '../../package.json'),
          'utf-8',
        );
        localVersion = (JSON.parse(localPackageJson) as { version: string }).version;
      } catch (error) {
        // eslint-disable-next-line  no-console
        console.error('Version mismatch check skipped. Unable to retrieve local version: ' + error);
      }
    }

    // Ensure older versions of the CLI fully exit
    if (major(localVersion) < 14) {
      forceExit = true;

      // Versions prior to 14 didn't implement completion command.
      if (rawCommandName === 'completion') {
        return null;
      }
    }

    let isGlobalGreater = false;
    try {
      isGlobalGreater = !!localVersion && globalVersion.compare(localVersion) > 0;
    } catch (error) {
      // eslint-disable-next-line  no-console
      console.error('Version mismatch check skipped. Unable to compare local version: ' + error);
    }

    // When using the completion command, don't show the warning as otherwise this will break completion.
    if (
      isGlobalGreater &&
      rawCommandName !== '--get-yargs-completions' &&
      rawCommandName !== 'completion'
    ) {
      // If using the update command and the global version is greater, use the newer update command
      // This allows improvements in update to be used in older versions that do not have bootstrapping
      if (
        rawCommandName === 'update' &&
        cli.VERSION &&
        cli.VERSION.major - globalVersion.major <= 1
      ) {
        cli = await import('./cli');
      } else if (await isWarningEnabled('versionMismatch')) {
        // Otherwise, use local version and warn if global is newer than local
        const warning =
          `Your global Angular CLI version (${globalVersion}) is greater than your local ` +
          `version (${localVersion}). The local Angular CLI version is used.\n\n` +
          'To disable this warning use "ng config -g cli.warnings.versionMismatch false".';

        // eslint-disable-next-line  no-console
        console.error(colors.yellow(warning));
      }
    }
  } catch {
    // If there is an error, resolve could not find the ng-cli
    // library from a package.json. Instead, include it from a relative
    // path to this script file (which is likely a globally installed
    // npm package). Most common cause for hitting this is `ng new`
    cli = await import('./cli');
  }

  if ('default' in cli) {
    cli = cli['default'];
  }

  return cli;
})()
  .then((cli) =>
    cli?.({
      cliArgs: process.argv.slice(2),
    }),
  )
  .then((exitCode = 0) => {
    if (forceExit) {
      process.exit(exitCode);
    }
    process.exitCode = exitCode;
  })
  .catch((err: Error) => {
    // eslint-disable-next-line  no-console
    console.error('Unknown error: ' + err.toString());
    process.exit(127);
  });
