/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    /**
     * The name of the directive.
     */
    name: string;
    /**
     * The path to create the interface.
     */
    path?: string;
    /**
     * The name of the project.
     */
    project?: string;
    /**
     * The prefix to apply to generated selectors.
     */
    prefix?: string;
    /**
     * Specifies if a spec file is generated.
     */
    spec?: boolean;
    /**
     * Flag to skip the module import.
     */
    skipImport?: boolean;
    /**
     * The selector to use for the directive.
     */
    selector?: string;
    /**
     * Flag to indicate if a dir is created.
     */
    flat?: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
    /**
     * Specifies if declaring module exports the directive.
     */
    export?: boolean;
}
