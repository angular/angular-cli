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
     * The name of the main entry-point file.
     */
    main?: string;
    /**
     * The name of the root module class.
     */
    rootModuleClassName?: string;
    /**
     * The name of the root module file
     */
    rootModuleFileName?: string;
    /**
     * Skip installing dependency packages.
     */
    skipInstall?: boolean;
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
}
