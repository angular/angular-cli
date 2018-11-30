export declare const DefaultTimeout = 45000;

export declare function request(url: string, headers?: {}): Promise<string>;

export declare function runTargetSpec(host: TestProjectHost, targetSpec: TargetSpecifier, overrides?: {}, timeout?: number, logger?: logging.Logger): Observable<BuildEvent>;

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
