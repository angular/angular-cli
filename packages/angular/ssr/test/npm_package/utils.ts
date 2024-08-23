/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { runfiles } from '@bazel/runfiles';
import { dirname, join } from 'node:path';

/**
 * Resolve paths for the Critters license file and the golden reference file.
 */
export const ANGULAR_SSR_PACKAGE_PATH = dirname(
  runfiles.resolve('angular_cli/packages/angular/ssr/npm_package/package.json'),
);

/**
 * Path to the actual license file for the Critters library.
 * This file is located in the `third_party/critters` directory of the Angular CLI npm package.
 */
export const CRITTERS_ACTUAL_LICENSE_FILE_PATH = join(
  ANGULAR_SSR_PACKAGE_PATH,
  'third_party/critters/THIRD_PARTY_LICENSES.txt',
);

/**
 * Path to the golden reference license file for the Critters library.
 * This file is used as a reference for comparison and is located in the same directory as this script.
 */
export const CRITTERS_GOLDEN_LICENSE_FILE_PATH = join(__dirname, 'THIRD_PARTY_LICENSES.txt.golden');
