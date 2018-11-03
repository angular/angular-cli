export declare class TempScopedNodeJsSyncHost extends virtualFs.ScopedHost<fs.Stats> {
    protected _root: Path;
    protected _sync: virtualFs.SyncDelegateHost<fs.Stats>;
    readonly files: Path[];
    readonly root: Path;
    readonly sync: virtualFs.SyncDelegateHost<fs.Stats>;
    constructor();
}
