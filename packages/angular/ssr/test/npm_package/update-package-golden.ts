/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { CRITTERS_ACTUAL_LICENSE_FILE_PATH, CRITTERS_GOLDEN_LICENSE_FILE_PATH } from './utils';

/**
 * Updates the golden reference license file.
 */
writeFileSync(CRITTERS_GOLDEN_LICENSE_FILE_PATH, readFileSync(CRITTERS_ACTUAL_LICENSE_FILE_PATH));
