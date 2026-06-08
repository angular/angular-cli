/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Regular expression to match Angular packages.
 * Checks for packages starting with `@angular/` or `@nguniversal/`.
 */
export const ANGULAR_PACKAGES_REGEXP = /^@(?:angular|nguniversal)\//;
