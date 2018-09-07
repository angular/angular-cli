/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * Flag to indicate if a dir is created.
     */
    flat?: boolean;
    /**
     * Specifies whether to apply lint fixes after generating the pipe.
     */
    lintFix?: boolean;
    /**
     * The name of the service.
     */
    name?: string;
    /**
     * The path to create the service.
     */
    path?: string;
    /**
     * The name of the project.
     */
    project?: string;
    /**
     * Specifies if a spec file is generated.
     */
    spec?: boolean;
}
