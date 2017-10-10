/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    name: string;
    path?: string;
    appRoot?: string;
    sourceDir?: string;
    routing?: boolean;
    routingScope?: ('Child' | 'Root');
    spec?: boolean;
    flat?: boolean;
    commonModule?: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
}
