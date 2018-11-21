export declare function createConsoleLogger(verbose?: boolean, stdout?: ProcessOutput, stderr?: ProcessOutput): logging.Logger;

export declare namespace fs {
    function isFile(filePath: string): boolean;
    function isDirectory(filePath: string): boolean;
}

export declare class ModuleNotFoundException extends BaseException {
    readonly basePath: string;
    readonly code: string;
    readonly moduleName: string;
    constructor(moduleName: string, basePath: string);
}

export declare class NodeJsAsyncHost implements virtualFs.Host<fs.Stats> {
    readonly capabilities: virtualFs.HostCapabilities;
    delete(path: Path): Observable<void>;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    read(path: Path): Observable<virtualFs.FileBuffer>;
    rename(from: Path, to: Path): Observable<void>;
    stat(path: Path): Observable<virtualFs.Stats<fs.Stats>> | null;
    watch(path: Path, _options?: virtualFs.HostWatchOptions): Observable<virtualFs.HostWatchEvent> | null;
    write(path: Path, content: virtualFs.FileBuffer): Observable<void>;
}

export declare class NodeJsSyncHost implements virtualFs.Host<fs.Stats> {
    readonly capabilities: virtualFs.HostCapabilities;
    delete(path: Path): Observable<void>;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    read(path: Path): Observable<virtualFs.FileBuffer>;
    rename(from: Path, to: Path): Observable<void>;
    stat(path: Path): Observable<virtualFs.Stats<fs.Stats>>;
    watch(path: Path, _options?: virtualFs.HostWatchOptions): Observable<virtualFs.HostWatchEvent> | null;
    write(path: Path, content: virtualFs.FileBuffer): Observable<void>;
}

export interface ProcessOutput {
    write(buffer: string | Buffer): boolean;
}

export declare function resolve(x: string, options: ResolveOptions): string;

export interface ResolveOptions {
    basedir: string;
    checkGlobal?: boolean;
    checkLocal?: boolean;
    extensions?: string[];
    paths?: string[];
    preserveSymlinks?: boolean;
    resolvePackageJson?: boolean;
}
