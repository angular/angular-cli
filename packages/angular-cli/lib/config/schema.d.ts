export interface CliConfig {
    /**
     * The global configuration of the project.
     */
    project?: {
        version?: string;
        name?: string;
    };
    /**
     * Properties of the different applications in this project.
     */
    apps?: {
        root?: string;
        outDir?: string;
        assets?: (string | string[]);
        deployUrl?: string;
        index?: string;
        main?: string;
        polyfills?: string;
        test?: string;
        tsconfig?: string;
        prefix?: string;
        mobile?: boolean;
        /**
         * Global styles to be included in the build.
         */
        styles?: (string | {
            input?: string;
            [name: string]: any;
        })[];
        /**
         * Options to pass to style preprocessors
         */
        stylePreprocessorOptions?: {
            /**
             * Paths to include. Paths will be resolved to project root.
             */
            includePaths?: string[];
        };
        /**
         * Global scripts to be included in the build.
         */
        scripts?: (string | {
            input: string;
            [name: string]: any;
        })[];
        /**
         * Name and corresponding file for environment config.
         */
        environments?: {
            [name: string]: any;
        };
    }[];
    /**
     * Configuration reserved for installed third party addons.
     */
    addons?: {
        [name: string]: any;
    }[];
    /**
     * Configuration reserved for installed third party packages.
     */
    packages?: {
        [name: string]: any;
    }[];
    e2e?: {
        protractor?: {
            config?: string;
        };
    };
    /**
     * Properties to be passed to TSLint.
     */
    lint?: {
        files: string;
        project: string;
        tslintConfig?: string;
    }[];
    test?: {
        karma?: {
            config?: string;
        };
    };
    defaults?: {
        styleExt?: string;
        prefixInterfaces?: boolean;
        poll?: number;
        viewEncapsulation?: string;
        changeDetection?: string;
        inline?: {
            style?: boolean;
            template?: boolean;
        };
        spec?: {
            class?: boolean;
            component?: boolean;
            directive?: boolean;
            module?: boolean;
            pipe?: boolean;
            service?: boolean;
        };
        /**
         * Properties to be passed to the serve command
         */
        serve?: {
            /**
             * The port the application will be served on
             */
            port?: number;
            /**
             * The host the application will be served on
             */
            host?: string;
        };
    };
    /**
     * Allow people to disable console warnings.
     */
    warnings?: {
        /**
         * Show a warning when the node version is incompatible.
         */
        nodeDeprecation?: boolean;
        /**
         * Show a warning when the user installed angular-cli.
         */
        packageDeprecation?: boolean;
        /**
         * Show a warning when the global version is newer than the local one.
         */
        versionMismatch?: boolean;
    };
}
