/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * The path to create the library's public API file.
     */
    entryFile?: string;
    /**
     * The name of the library.
     */
    name?: string;
    /**
     * The prefix to apply to generated selectors.
     */
    prefix?: string;
    /**
     * Skip installing dependency packages.
     */
    skipInstall?: boolean;
    /**
     * Do not add dependencies to package.json.
     */
    skipPackageJson?: boolean;
    /**
     * Do not update tsconfig.json for development experience.
     */
    skipTsConfig?: boolean;
}
