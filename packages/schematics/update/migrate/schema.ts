/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * The collection to load the migrations from.
     */
    collection: string;
    /**
     * The version installed previously.
     */
    from: string;
    /**
     * The package to migrate.
     */
    package: string;
    /**
     * The version to migrate to.
     */
    to: string;
}
