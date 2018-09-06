/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * Whether to update all packages in package.json.
     */
    all: boolean;
    /**
     * If false, will error out if installed packages are incompatible with the update.
     */
    force: boolean;
    /**
     * Version from which to migrate from. Only available with a single package being updated,
     * and only on migration only.
     */
    from?: string;
    /**
     * Only perform a migration, does not update the installed version.
     */
    migrateOnly: boolean;
    /**
     * Use the largest version, including beta and RCs.
     */
    next: boolean;
    /**
     * The packages to get.
     */
    packages?: string[];
    /**
     * The NPM registry to use.
     */
    registry?: string;
    /**
     * Version up to which to apply migrations. Only available with a single package being
     * updated, and only on migrations only. Requires from to be specified. Default to the
     * installed version detected.
     */
    to?: string;
}
