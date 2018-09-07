/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * Specifies if declaring module exports the pipe.
     */
    export?: boolean;
    /**
     * Flag to indicate if a dir is created.
     */
    flat?: boolean;
    /**
     * Specifies whether to apply lint fixes after generating the pipe.
     */
    lintFix?: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
    /**
     * The name of the pipe.
     */
    name?: string;
    /**
     * The path to create the pipe.
     */
    path?: string;
    /**
     * The name of the project.
     */
    project?: string;
    /**
     * Allows for skipping the module import.
     */
    skipImport?: boolean;
    /**
     * Specifies if a spec file is generated.
     */
    spec?: boolean;
}
