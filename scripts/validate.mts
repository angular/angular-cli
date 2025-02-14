/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execSync } from 'node:child_process';
import templates from './templates.mjs';
import validateUserAnalytics from './validate-user-analytics.mjs';

export default async function (options: { verbose: boolean }) {
  let error = false;

  if (execSync(`git status --porcelain`).toString()) {
    console.error('There are local changes.');
    if (!options.verbose) {
      return 101;
    }
    error = true;
  }

  console.info('Running templates validation...');
  await templates({});
  if (execSync(`git status --porcelain`).toString()) {
    console.error(
      'Running templates updated files... Please run "devkit-admin templates" before submitting a PR.',
    );
    if (!options.verbose) {
      process.exit(2);
    }
    error = true;
  }

  console.info('');
  console.info('Running User Analytics validation...');
  error = (await validateUserAnalytics({})) != 0 || error;

  if (error) {
    return 101;
  }

  return 0;
}
