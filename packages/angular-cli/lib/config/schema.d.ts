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
        assets?: string[];
        index?: string;
        main?: string;
        nodeMain?: string;
        test?: string;
        tsconfig?: string;
        prefix?: string;
        mobile?: boolean;
        universal?: boolean;
        /**
         * Global styles to be included in the build.
         */
        styles?: string[];
        /**
         * Global scripts to be included in the build.
         */
        scripts?: string[];
        /**
         * Name and corresponding file for environment config.
         */
        environments?: {
            [name: string]: any;
        };
        /**
         * Name and corresponding file for custom webpack config.
         */
        webpackCustom?: {
            client?: string;
            server?: string;
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
    };
}
