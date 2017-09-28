/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export interface Schema {
    /**
     * Name of the universal app
     */
    name?: string;
    /**
     * Name or index of related client app.
     */
    clientApp?: string;
    /**
     * The appId to use withServerTransition.
     */
    appId?: string;
    /**
     * The output directory for build results.
     */
    outDir?: string;
    /**
     * The root directory of the app.
     */
    root?: string;
    /**
     * Name of the index file
     */
    index?: string;
    /**
     * The name of the main entry-point file.
     */
    main?: string;
    /**
     * The name of the test entry-point file.
     */
    test?: string;
    /**
     * The name of the TypeScript configuration file.
     */
    tsconfigFileName?: string;
    /**
     * The name of the TypeScript configuration file for tests.
     */
    testTsconfigFileName?: string;
    /**
     * The name of the applicatino directory.
     */
    appDir?: string;
    /**
     * The name of the root module file
     */
    rootModuleFileName?: string;
    /**
     * The name of the root module class.
     */
    rootModuleClassName?: string;
    sourceDir?: string;
}
