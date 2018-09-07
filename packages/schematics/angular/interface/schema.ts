/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * Specifies whether to apply lint fixes after generating the directive.
     */
    lintFix?: boolean;
    /**
     * The name of the interface.
     */
    name?: string;
    /**
     * The path to create the interface.
     */
    path?: string;
    /**
     * Specifies the prefix to use.
     */
    prefix?: string;
    /**
     * The name of the project.
     */
    project?: string;
    /**
     * Specifies the type of interface.
     */
    type?: string;
}
