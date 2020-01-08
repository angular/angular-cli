export declare class TempScopedNodeJsSyncHost extends virtualFs.ScopedHost<fs.Stats> {
    protected _root: Path;
    protected _sync: virtualFs.SyncDelegateHost<fs.Stats>;
    get files(): Path[];
    get root(): Path;
    get sync(): virtualFs.SyncDelegateHost<fs.Stats>;
    constructor();
}
