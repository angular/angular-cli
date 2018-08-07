/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    /**
     * The root directory of the new application.
     */
    projectRoot?: string;
    /**
     * The name of the application.
     */
    name: string;
    /**
     * EXPERIMENTAL: Specifies whether to create a new application which uses the Ivy rendering
     * engine.
     */
    experimentalIvy?: boolean;
    /**
     * Specifies if the style will be in the ts file.
     */
    inlineStyle?: boolean;
    /**
     * Specifies if the template will be in the ts file.
     */
    inlineTemplate?: boolean;
    /**
     * Specifies the view encapsulation strategy.
     */
    viewEncapsulation?: ('Emulated' | 'Native' | 'None');
    /**
     * Generates a routing module.
     */
    routing?: boolean;
    /**
     * The prefix to apply to generated selectors.
     */
    prefix?: string;
    /**
     * The file extension to be used for style files.
     */
    style?: string;
    /**
     * Skip creating spec files.
     */
    skipTests?: boolean;
    /**
    * Do not add dependencies to package.json (e.g., --skipPackageJson)
    */
    skipPackageJson?: boolean;
}
