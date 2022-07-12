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

// Invoke ng new with any parameters provided.
const { error } = spawnSync(process.execPath, [binPath, 'new', ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (error) {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
}
