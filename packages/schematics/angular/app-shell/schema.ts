/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * The name of the application directory.
     */
    appDir?: string;
    /**
     * The appId to use withServerTransition.
     */
    appId?: string;
    /**
     * Name of related client app.
     */
    clientProject: string;
    /**
     * Name of the index file
     */
    index?: string;
    /**
     * The name of the main entry-point file.
     */
    main?: string;
    /**
     * Name of the universal app
     */
    name?: string;
    /**
     * The output directory for build results.
     */
    outDir?: string;
    /**
     * The root directory of the app.
     */
    root?: string;
    /**
     * The name of the root module class.
     */
    rootModuleClassName?: string;
    /**
     * The name of the root module file
     */
    rootModuleFileName?: string;
    /**
     * Route path used to produce the app shell.
     */
    route?: string;
    /**
     * The path of the source directory.
     */
    sourceDir?: string;
    /**
     * The name of the test entry-point file.
     */
    test?: string;
    /**
     * The name of the TypeScript configuration file for tests.
     */
    testTsconfigFileName?: string;
    /**
     * The name of the TypeScript configuration file.
     */
    tsconfigFileName?: string;
    /**
     * Name of related universal app.
     */
    universalProject: string;
}
