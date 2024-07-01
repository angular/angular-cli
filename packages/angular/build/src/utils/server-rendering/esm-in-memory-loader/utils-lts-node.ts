/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { lt } from 'semver';

/** TODO: Remove when Node.js versions < 22.2 are no longer supported. */
export const isLegacyESMLoaderImplementation = lt(process.version, '22.2.0');
