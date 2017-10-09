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
     * Specifies the prefix to use.
     */
    prefix?: string;
    /**
     * Specifies the type of interface.
     */
    type?: string;
}
