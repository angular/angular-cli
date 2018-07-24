/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    /**
     * The name of the service.
     */
    name: string;
    /**
     * The path to create the service.
     */
    path?: string;
    /**
     * The name of the project.
     */
    project?: string;
    /**
     * Flag to indicate if a dir is created.
     */
    flat?: boolean;
    /**
     * Specifies if a spec file is generated.
     */
    spec?: boolean;
    /**
     * Specifies whether to apply lint fixes after generating the component.
     */
    lintFix?: boolean;
}
