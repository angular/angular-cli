/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    /**
     * The name of the guard.
     */
    name: string;
    /**
     * Specifies if a spec file is generated.
     */
    spec?: boolean;
    /**
     * Flag to indicate if a dir is created.
     */
    flat?: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
    /**
     * The path to create the guard.
     */
    path?: string;
    /**
     * The path of the source directory.
     */
    sourceDir?: string;
    /**
     * The root of the application.
     */
    appRoot?: string;
}
