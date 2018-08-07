/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    /**
     * The name of the workspace.
     */
    name: string;
    /**
     * Uses the next version of Angular.
     */
    experimentalAngularNext?: boolean;
    /**
     * The path where new projects will be created.
     */
    newProjectRoot?: string;
    /**
     * Skip installing dependency packages.
     */
    skipInstall?: boolean;
    /**
     * Link CLI to global version (internal development only).
     */
    linkCli?: boolean;
    /**
     * Skip initializing a git repository.
     */
    skipGit?: boolean;
    /**
     * Initial repository commit information.
     */
    commit?: { name: string, email: string, message?: string };
    /**
     * The version of the Angular CLI to use.
     */
    version?: string;
}
