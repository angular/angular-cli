export declare class NodePackageInstallTask implements TaskConfigurationGenerator<NodePackageTaskOptions> {
    packageManager?: string;
    packageName?: string;
    quiet: boolean;
    workingDirectory?: string;
    constructor(options: Partial<NodePackageInstallTaskOptions>);
    constructor(workingDirectory?: string);
    toConfiguration(): TaskConfiguration<NodePackageTaskOptions>;
}

export declare class NodePackageLinkTask implements TaskConfigurationGenerator<NodePackageTaskOptions> {
    packageName?: string | undefined;
    quiet: boolean;
    workingDirectory?: string | undefined;
    constructor(packageName?: string | undefined, workingDirectory?: string | undefined);
    toConfiguration(): TaskConfiguration<NodePackageTaskOptions>;
}

export declare class RepositoryInitializerTask implements TaskConfigurationGenerator<RepositoryInitializerTaskOptions> {
    commitOptions?: CommitOptions | undefined;
    workingDirectory?: string | undefined;
    constructor(workingDirectory?: string | undefined, commitOptions?: CommitOptions | undefined);
    toConfiguration(): TaskConfiguration<RepositoryInitializerTaskOptions>;
}

export declare class RunSchematicTask<T> implements TaskConfigurationGenerator<RunSchematicTaskOptions<T>> {
    protected _collection: string | null;
    protected _options: T;
    protected _schematic: string;
    constructor(c: string, s: string, o: T);
    constructor(s: string, o: T);
    toConfiguration(): TaskConfiguration<RunSchematicTaskOptions<T>>;
}

export declare class TslintFixTask implements TaskConfigurationGenerator<TslintFixTaskOptions> {
    protected _configOrPath: null | string | JsonObject;
    protected _options: TslintFixTaskOptionsBase;
    constructor(config: JsonObject, options: TslintFixTaskOptionsBase);
    constructor(options: TslintFixTaskOptionsBase);
    constructor(path: string, options: TslintFixTaskOptionsBase);
    toConfiguration(): TaskConfiguration<TslintFixTaskOptions>;
}
