#!/usr/bin/env node
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { spawnSync } from 'child_process';
import { join } from 'path';

const binPath = join(require.resolve('@angular/cli/package.json'), '../bin/ng.js');
const args = process.argv.slice(2);

const hasPackageManagerArg = args.some((a) => a.startsWith('--package-manager'));
if (!hasPackageManagerArg) {
  // Ex: yarn/1.22.18 npm/? node/v16.15.1 linux x64
  const packageManager = process.env['npm_config_user_agent']?.split('/')[0];
  if (packageManager && ['npm', 'pnpm', 'yarn', 'cnpm'].includes(packageManager)) {
    args.push('--package-manager', packageManager);
  }
}

// Invoke ng new with any parameters provided.
const { error } = spawnSync(process.execPath, [binPath, 'new', ...args], {
  stdio: 'inherit',
});

if (error) {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
}
