/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    /**
     * The name of the project.
     */
    project?: string;
    /**
     * ": "The target to apply service worker to.
     */
    target: string;
    /**
     * The configuration to apply service worker to.
     */
    configuration: string;
}
