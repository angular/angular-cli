/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    name: string;
    spec?: boolean;
    flat?: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
    path?: string;
    appRoot?: string;
    sourceDir?: string;
}
