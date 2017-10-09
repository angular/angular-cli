/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    // tslint:disable-next-line:no-any
    _?: any;
    // tslint:disable-next-line:no-any
    _angularCliConfig?: any;
    // tslint:disable-next-line:no-any
    _angularCliAppConfig?: any;
    // tslint:disable-next-line:no-any
    _angularCliParsedPath?: any;

    name: string;
    path?: string;
    appRoot?: string;
    sourceDir?: string;
    /**
     * Flag to indicate if a dir is created.
     */
    flat?: boolean;
    /**
     * Specifies if a spec file is generated.
     */
    spec?: boolean;
    /**
     * Allows for skipping the module import.
     */
    skipImport?: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
    /**
     * Specifies if declaring module exports the pipe.
     */
    export?: boolean;
}
