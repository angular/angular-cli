export declare class TestingArchitectHost implements ArchitectHost {
    currentDirectory: string;
    workspaceRoot: string;
    constructor(workspaceRoot?: string, currentDirectory?: string, _backendHost?: ArchitectHost | null);
    addBuilder(builderName: string, builder: Builder, description?: string, optionSchema?: json.schema.JsonSchema): void;
    addBuilderFromPackage(packageName: string): Promise<void>;
    addTarget(target: Target, builderName: string, options?: json.JsonObject): void;
    getBuilderNameForTarget(target: Target): Promise<string | null>;
    getCurrentDirectory(): Promise<string>;
    getOptionsForTarget(target: Target): Promise<json.JsonObject | null>;
    getWorkspaceRoot(): Promise<string>;
    loadBuilder(info: BuilderInfo): Promise<Builder | null>;
    resolveBuilder(builderName: string): Promise<BuilderInfo | null>;
}

export declare class TestLogger extends logging.Logger {
    constructor(name: string, parent?: logging.Logger | null);
    clear(): void;
    includes(message: string): boolean;
    test(re: RegExp): boolean;
}

export declare class TestProjectHost extends NodeJsSyncHost {
    protected _templateRoot: Path;
    constructor(_templateRoot: Path);
    appendToFile(path: string, str: string): void;
    copyFile(from: string, to: string): void;
    fileMatchExists(dir: string, regex: RegExp): PathFragment | undefined;
    initialize(): Observable<void>;
    replaceInFile(path: string, match: RegExp | string, replacement: string): void;
    restore(): Observable<void>;
    root(): Path;
    scopedSync(): virtualFs.SyncDelegateHost<Stats>;
    writeMultipleFiles(files: {
        [path: string]: string | ArrayBufferLike | Buffer;
    }): void;
}
