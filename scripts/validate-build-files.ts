/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-implicit-dependencies
import { logging, tags } from '@angular-devkit/core';
import { existsSync } from 'fs';
import { join } from 'path';
import { packages } from '../lib/packages';

export default async function (_options: {}, logger: logging.Logger) {
  let error = false;

  for (const pkgName of Object.keys(packages)) {
    const pkg = packages[pkgName];

    if (pkg.packageJson.private) {
      // Ignore private packages.
      continue;
    }

    // There should be at least one BUILD file next to each package.json.
    if (!existsSync(join(pkg.root, 'BUILD'))) {
      logger.error(tags.oneLine`
        The package ${JSON.stringify(pkgName)} does not have a BUILD file associated to it. You
        must either set an exception or make sure it can be built using Bazel.
      `);
      error = true;
    }
  }

  // TODO: enable this to break
  if (error) {
    // process.exit(1);
    logger.warn('Found some BUILD files missing, which will be breaking your PR soon.');
  }

  return 0;
}
