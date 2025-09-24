/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  apply,
  applyTemplates,
  filter,
  mergeWith,
  noop,
  strings,
  url,
} from '@angular-devkit/schematics';
import { execSync } from 'node:child_process';
import { latestVersions } from '../utility/latest-versions';
import { Schema as WorkspaceOptions } from './schema';

export default function (options: WorkspaceOptions): Rule {
  return () => {
    const packageManager = options.packageManager;
    let packageManagerWithVersion: string | undefined;

    if (packageManager) {
      let packageManagerVersion: string | undefined;
      try {
        packageManagerVersion = execSync(`${packageManager} --version`, {
          encoding: 'utf8',
          stdio: 'pipe',
          env: {
            ...process.env,
            //  NPM updater notifier will prevents the child process from closing until it timeout after 3 minutes.
            NO_UPDATE_NOTIFIER: '1',
            NPM_CONFIG_UPDATE_NOTIFIER: 'false',
          },
        }).trim();
      } catch {}

      if (packageManagerVersion) {
        packageManagerWithVersion = `${packageManager}@${packageManagerVersion}`;
      }
    }

    return mergeWith(
      apply(url('./files'), [
        options.minimal ? filter((path) => !path.endsWith('editorconfig.template')) : noop(),
        applyTemplates({
          utils: strings,
          ...options,
          'dot': '.',
          latestVersions,
          packageManagerWithVersion,
        }),
      ]),
    );
  };
}
