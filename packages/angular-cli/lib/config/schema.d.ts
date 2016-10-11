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
        assets?: string;
        index?: string;
        main?: string;
        test?: string;
        tsconfig?: string;
        prefix?: string;
        mobile?: boolean;
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
