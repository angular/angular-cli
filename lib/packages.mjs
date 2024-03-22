/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import fastGlob from 'fast-glob';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const monorepoData = require('../.monorepo.json');

export function getReleasablePackages() {
  const packages = [];
  for (const pkg of fastGlob.sync('./packages/*/*/package.json')) {
    const data = JSON.parse(readFileSync(pkg, 'utf-8'));
    if (!(data.name in monorepoData.packages)) {
      throw new Error(`${data.name} does not exist in .monorepo.json`);
    }

    if (data.private) {
      continue;
    }

    packages.push(data);
  }

  return packages;
}
