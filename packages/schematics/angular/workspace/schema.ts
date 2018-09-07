/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * Initial repository commit information.
     */
    commit?: null | Commit;
    /**
     * Use the next version of Angular (@next dist-tag).
     */
    experimentalAngularNext?: boolean;
    /**
     * Link CLI to global version (internal development only).
     */
    linkCli?: boolean;
    /**
     * The name of the workspace.
     */
    name: string;
    /**
     * The path where new projects will be created.
     */
    newProjectRoot?: string;
    /**
     * Skip initializing a git repository.
     */
    skipGit?: boolean;
    /**
     * Skip installing dependency packages.
     */
    skipInstall?: boolean;
    /**
     * The version of the Angular CLI to use.
     */
    version: string;
}

export interface Commit {
    email:    string;
    message?: string;
    name:     string;
}
