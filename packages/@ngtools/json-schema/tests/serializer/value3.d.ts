interface _ {
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
        test?: string;
        tsconfig?: string;
        prefix?: string;
        /**
         * Global styles to be included in the build.
         */
        styles?: (string | {
            input?: string;
            [name: string]: any;
        })[];
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
export default _;
