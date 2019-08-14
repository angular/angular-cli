export declare type Action = CreateFileAction | OverwriteFileAction | RenameFileAction | DeleteFileAction;

export interface ActionBase {
    readonly id: number;
    readonly parent: number;
    readonly path: Path;
}

export declare class ActionList implements Iterable<Action> {
    readonly length: number;
    [Symbol.iterator](): IterableIterator<Action>;
    protected _action(action: Partial<Action>): void;
    create(path: Path, content: Buffer): void;
    delete(path: Path): void;
    find(predicate: (value: Action) => boolean): Action | null;
    forEach(fn: (value: Action, index: number, array: Action[]) => void, thisArg?: {}): void;
    get(i: number): Action;
    has(action: Action): boolean;
    optimize(): void;
    overwrite(path: Path, content: Buffer): void;
    push(action: Action): void;
    rename(path: Path, to: Path): void;
}

export declare function apply(source: Source, rules: Rule[]): Source;

export declare function applyContentTemplate<T>(options: T): FileOperator;

export declare function applyPathTemplate<T extends PathTemplateData>(data: T, options?: PathTemplateOptions): FileOperator;

export declare function applyTemplates<T>(options: T): Rule;

export declare function applyToSubtree(path: string, rules: Rule[]): Rule;

export declare function asSource(rule: Rule): Source;

export declare type AsyncFileOperator = (tree: FileEntry) => Observable<FileEntry | null>;

export declare abstract class BaseWorkflow implements Workflow {
    protected _context: WorkflowExecutionContext[];
    protected _dryRun: boolean;
    protected _engine: Engine<{}, {}>;
    protected _engineHost: EngineHost<{}, {}>;
    protected _force: boolean;
    protected _host: virtualFs.Host;
    protected _lifeCycle: Subject<LifeCycleEvent>;
    protected _registry: schema.CoreSchemaRegistry;
    protected _reporter: Subject<DryRunEvent>;
    readonly context: Readonly<WorkflowExecutionContext>;
    readonly engine: Engine<{}, {}>;
    readonly engineHost: EngineHost<{}, {}>;
    readonly lifeCycle: Observable<LifeCycleEvent>;
    readonly registry: schema.SchemaRegistry;
    readonly reporter: Observable<DryRunEvent>;
    constructor(options: BaseWorkflowOptions);
    protected _createSinks(): Sink[];
    execute(options: Partial<WorkflowExecutionContext> & RequiredWorkflowExecutionContext): Observable<void>;
}

export interface BaseWorkflowOptions {
    dryRun?: boolean;
    engineHost: EngineHost<{}, {}>;
    force?: boolean;
    host: virtualFs.Host;
    registry?: schema.CoreSchemaRegistry;
}

export declare function branchAndMerge(rule: Rule, strategy?: MergeStrategy): Rule;

export declare function callRule(rule: Rule, input: Tree | Observable<Tree>, context: SchematicContext): Observable<Tree>;

export declare function callSource(source: Source, context: SchematicContext): Observable<Tree>;

export declare function chain(rules: Rule[]): Rule;

export declare class CircularCollectionException extends BaseException {
    constructor(name: string);
}

export interface Collection<CollectionMetadataT extends object, SchematicMetadataT extends object> {
    readonly baseDescriptions?: Array<CollectionDescription<CollectionMetadataT>>;
    readonly description: CollectionDescription<CollectionMetadataT>;
    createSchematic(name: string, allowPrivate?: boolean): Schematic<CollectionMetadataT, SchematicMetadataT>;
    listSchematicNames(): string[];
}

export declare type CollectionDescription<CollectionMetadataT extends object> = CollectionMetadataT & {
    readonly name: string;
    readonly extends?: string[];
};

export declare class CollectionImpl<CollectionT extends object, SchematicT extends object> implements Collection<CollectionT, SchematicT> {
    readonly baseDescriptions?: CollectionDescription<CollectionT>[] | undefined;
    readonly description: CollectionDescription<CollectionT>;
    readonly name: string;
    constructor(_description: CollectionDescription<CollectionT>, _engine: SchematicEngine<CollectionT, SchematicT>, baseDescriptions?: CollectionDescription<CollectionT>[] | undefined);
    createSchematic(name: string, allowPrivate?: boolean): Schematic<CollectionT, SchematicT>;
    listSchematicNames(): string[];
}

export declare function composeFileOperators(operators: FileOperator[]): FileOperator;

export declare class ContentHasMutatedException extends BaseException {
    constructor(path: string);
}

export declare function contentTemplate<T>(options: T): Rule;

export interface CreateFileAction extends ActionBase {
    readonly content: Buffer;
    readonly kind: 'c';
}

export declare class DelegateTree implements Tree {
    protected _other: Tree;
    readonly actions: Action[];
    readonly root: DirEntry;
    constructor(_other: Tree);
    apply(action: Action, strategy?: MergeStrategy): void;
    beginUpdate(path: string): UpdateRecorder;
    branch(): Tree;
    commitUpdate(record: UpdateRecorder): void;
    create(path: string, content: Buffer | string): void;
    delete(path: string): void;
    exists(path: string): boolean;
    get(path: string): FileEntry | null;
    getDir(path: string): DirEntry;
    merge(other: Tree, strategy?: MergeStrategy): void;
    overwrite(path: string, content: Buffer | string): void;
    read(path: string): Buffer | null;
    rename(from: string, to: string): void;
    visit(visitor: FileVisitor): void;
}

export interface DeleteFileAction extends ActionBase {
    readonly kind: 'd';
}

export interface DirEntry {
    readonly parent: DirEntry | null;
    readonly path: Path;
    readonly subdirs: PathFragment[];
    readonly subfiles: PathFragment[];
    dir(name: PathFragment): DirEntry;
    file(name: PathFragment): FileEntry | null;
    visit(visitor: FileVisitor): void;
}

export interface DryRunCreateEvent {
    content: Buffer;
    kind: 'create';
    path: string;
}

export interface DryRunDeleteEvent {
    kind: 'delete';
    path: string;
}

export interface DryRunErrorEvent {
    description: 'alreadyExist' | 'doesNotExist';
    kind: 'error';
    path: string;
}

export declare type DryRunEvent = DryRunErrorEvent | DryRunDeleteEvent | DryRunCreateEvent | DryRunUpdateEvent | DryRunRenameEvent;

export interface DryRunRenameEvent {
    kind: 'rename';
    path: string;
    to: string;
}

export declare class DryRunSink extends HostSink {
    protected _fileAlreadyExistExceptionSet: Set<string>;
    protected _fileDoesNotExistExceptionSet: Set<string>;
    protected _subject: Subject<DryRunEvent>;
    readonly reporter: Observable<DryRunEvent>;
    constructor(dir: string, force?: boolean);
    constructor(host: virtualFs.Host, force?: boolean);
    _done(): Observable<void>;
    protected _fileAlreadyExistException(path: string): void;
    protected _fileDoesNotExistException(path: string): void;
}

export interface DryRunUpdateEvent {
    content: Buffer;
    kind: 'update';
    path: string;
}

export declare function empty(): Source;

export declare class EmptyTree extends HostTree {
    constructor();
}

export interface Engine<CollectionMetadataT extends object, SchematicMetadataT extends object> {
    readonly defaultMergeStrategy: MergeStrategy;
    readonly workflow: Workflow | null;
    createCollection(name: string): Collection<CollectionMetadataT, SchematicMetadataT>;
    createContext(schematic: Schematic<CollectionMetadataT, SchematicMetadataT>, parent?: Partial<TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>>, executionOptions?: Partial<ExecutionOptions>): TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>;
    createSchematic(name: string, collection: Collection<CollectionMetadataT, SchematicMetadataT>): Schematic<CollectionMetadataT, SchematicMetadataT>;
    createSourceFromUrl(url: Url, context: TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>): Source;
    executePostTasks(): Observable<void>;
    transformOptions<OptionT extends object, ResultT extends object>(schematic: Schematic<CollectionMetadataT, SchematicMetadataT>, options: OptionT, context?: TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>): Observable<ResultT>;
}

export interface EngineHost<CollectionMetadataT extends object, SchematicMetadataT extends object> {
    readonly defaultMergeStrategy?: MergeStrategy;
    createCollectionDescription(name: string): CollectionDescription<CollectionMetadataT>;
    createSchematicDescription(name: string, collection: CollectionDescription<CollectionMetadataT>): SchematicDescription<CollectionMetadataT, SchematicMetadataT> | null;
    createSourceFromUrl(url: Url, context: TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>): Source | null;
    createTaskExecutor(name: string): Observable<TaskExecutor>;
    getSchematicRuleFactory<OptionT extends object>(schematic: SchematicDescription<CollectionMetadataT, SchematicMetadataT>, collection: CollectionDescription<CollectionMetadataT>): RuleFactory<OptionT>;
    hasTaskExecutor(name: string): boolean;
    listSchematicNames(collection: CollectionDescription<CollectionMetadataT>): string[];
    listSchematics(collection: Collection<CollectionMetadataT, SchematicMetadataT>): string[];
    transformContext(context: TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>): TypedSchematicContext<CollectionMetadataT, SchematicMetadataT> | void;
    transformOptions<OptionT extends object, ResultT extends object>(schematic: SchematicDescription<CollectionMetadataT, SchematicMetadataT>, options: OptionT, context?: TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>): Observable<ResultT>;
}

export interface ExecutionOptions {
    interactive: boolean;
    scope: string;
}

export declare function externalSchematic<OptionT extends object>(collectionName: string, schematicName: string, options: OptionT, executionOptions?: Partial<ExecutionOptions>): Rule;

export declare class FileAlreadyExistException extends BaseException {
    constructor(path: string);
}

export declare class FileDoesNotExistException extends BaseException {
    constructor(path: string);
}

export interface FileEntry {
    readonly content: Buffer;
    readonly path: Path;
}

export declare type FileOperator = (entry: FileEntry) => FileEntry | null;

export interface FilePredicate<T> {
    (path: Path, entry?: Readonly<FileEntry> | null): T;
}

export declare class FileSystemSink extends HostSink {
    constructor(dir: string, force?: boolean);
}

export declare type FileVisitor = FilePredicate<void>;

export declare const FileVisitorCancelToken: symbol;

export declare function filter(predicate: FilePredicate<boolean>): Rule;

export declare class FilterHostTree extends HostTree {
    constructor(tree: HostTree, filter?: FilePredicate<boolean>);
}

export declare function forEach(operator: FileOperator): Rule;

export declare class HostCreateTree extends HostTree {
    constructor(host: virtualFs.ReadonlyHost);
}

export declare class HostDirEntry implements DirEntry {
    protected _host: virtualFs.SyncDelegateHost;
    protected _tree: Tree;
    readonly parent: DirEntry | null;
    readonly path: Path;
    readonly subdirs: PathFragment[];
    readonly subfiles: PathFragment[];
    constructor(parent: DirEntry | null, path: Path, _host: virtualFs.SyncDelegateHost, _tree: Tree);
    dir(name: PathFragment): DirEntry;
    file(name: PathFragment): FileEntry | null;
    visit(visitor: FileVisitor): void;
}

export declare class HostSink extends SimpleSinkBase {
    protected _filesToCreate: Map<Path, UpdateBuffer>;
    protected _filesToDelete: Set<Path>;
    protected _filesToRename: Set<[Path, Path]>;
    protected _filesToUpdate: Map<Path, UpdateBuffer>;
    protected _force: boolean;
    protected _host: virtualFs.Host;
    constructor(_host: virtualFs.Host, _force?: boolean);
    protected _createFile(path: Path, content: Buffer): Observable<void>;
    protected _deleteFile(path: Path): Observable<void>;
    _done(): Observable<void>;
    protected _overwriteFile(path: Path, content: Buffer): Observable<void>;
    protected _renameFile(from: Path, to: Path): Observable<void>;
    protected _validateCreateAction(action: CreateFileAction): Observable<void>;
    protected _validateFileExists(p: Path): Observable<boolean>;
}

export declare class HostTree implements Tree {
    protected _backend: virtualFs.ReadonlyHost<{}>;
    readonly actions: Action[];
    readonly root: DirEntry;
    constructor(_backend?: virtualFs.ReadonlyHost<{}>);
    protected _normalizePath(path: string): Path;
    protected _willCreate(path: Path): boolean;
    protected _willDelete(path: Path): boolean;
    protected _willOverwrite(path: Path): boolean;
    protected _willRename(path: Path): boolean;
    apply(action: Action, strategy?: MergeStrategy): void;
    beginUpdate(path: string): UpdateRecorder;
    branch(): Tree;
    commitUpdate(record: UpdateRecorder): void;
    create(path: string, content: Buffer | string): void;
    delete(path: string): void;
    exists(path: string): boolean;
    get(path: string): FileEntry | null;
    getDir(path: string): DirEntry;
    merge(other: Tree, strategy?: MergeStrategy): void;
    overwrite(path: string, content: Buffer | string): void;
    read(path: string): Buffer | null;
    rename(from: string, to: string): void;
    visit(visitor: FileVisitor): void;
    static isHostTree(tree: Tree): tree is HostTree;
}

export declare const htmlSelectorFormat: schema.SchemaFormat;

export declare class InvalidPipeException extends BaseException {
    constructor(name: string);
}

export declare class InvalidRuleResultException extends BaseException {
    constructor(value?: {});
}

export declare class InvalidSchematicsNameException extends BaseException {
    constructor(name: string);
}

export declare class InvalidSourceResultException extends BaseException {
    constructor(value?: {});
}

export declare class InvalidUpdateRecordException extends BaseException {
    constructor();
}

export declare function isAction(action: any): action is Action;

export declare function isContentAction(action: Action): action is CreateFileAction | OverwriteFileAction;

export interface LifeCycleEvent {
    kind: 'start' | 'end' | 'workflow-start' | 'workflow-end' | 'post-tasks-start' | 'post-tasks-end';
}

export declare class MergeConflictException extends BaseException {
    constructor(path: string);
}

export declare enum MergeStrategy {
    AllowOverwriteConflict = 2,
    AllowCreationConflict = 4,
    AllowDeleteConflict = 8,
    Default = 0,
    Error = 1,
    ContentOnly = 2,
    Overwrite = 14
}

export declare function mergeWith(source: Source, strategy?: MergeStrategy): Rule;

export declare function move(from: string, to?: string): Rule;

export declare function noop(): Rule;

export declare class OptionIsNotDefinedException extends BaseException {
    constructor(name: string);
}

export interface OverwriteFileAction extends ActionBase {
    readonly content: Buffer;
    readonly kind: 'o';
}

export declare function partitionApplyMerge(predicate: FilePredicate<boolean>, ruleYes: Rule, ruleNo?: Rule): Rule;

export declare const pathFormat: schema.SchemaFormat;

export declare function pathTemplate<T extends PathTemplateData>(options: T): Rule;

export declare type PathTemplateData = {
    [key: string]: PathTemplateValue | PathTemplateData | PathTemplatePipeFunction;
};

export interface PathTemplateOptions {
    interpolationEnd: string;
    interpolationStart: string;
    pipeSeparator?: string;
}

export declare type PathTemplatePipeFunction = (x: string) => PathTemplateValue;

export declare type PathTemplateValue = boolean | string | number | undefined;

export declare class PrivateSchematicException extends BaseException {
    constructor(name: string, collection: CollectionDescription<{}>);
}

export interface RandomOptions {
    multi?: boolean | number;
    multiFiles?: boolean | number;
    root?: string;
}

export interface RenameFileAction extends ActionBase {
    readonly kind: 'r';
    readonly to: Path;
}

export declare function renameTemplateFiles(): Rule;

export interface RequiredWorkflowExecutionContext {
    collection: string;
    options: object;
    schematic: string;
}

export declare type Rule = (tree: Tree, context: SchematicContext) => Tree | Observable<Tree> | Rule | Promise<void> | Promise<Rule> | void;

export declare type RuleFactory<T extends object> = (options: T) => Rule;

export declare function schematic<OptionT extends object>(schematicName: string, options: OptionT, executionOptions?: Partial<ExecutionOptions>): Rule;

export interface Schematic<CollectionMetadataT extends object, SchematicMetadataT extends object> {
    readonly collection: Collection<CollectionMetadataT, SchematicMetadataT>;
    readonly description: SchematicDescription<CollectionMetadataT, SchematicMetadataT>;
    call<OptionT extends object>(options: OptionT, host: Observable<Tree>, parentContext?: Partial<TypedSchematicContext<CollectionMetadataT, SchematicMetadataT>>, executionOptions?: Partial<ExecutionOptions>): Observable<Tree>;
}

export declare type SchematicContext = TypedSchematicContext<{}, {}>;

export declare type SchematicDescription<CollectionMetadataT extends object, SchematicMetadataT extends object> = SchematicMetadataT & {
    readonly collection: CollectionDescription<CollectionMetadataT>;
    readonly name: string;
    readonly private?: boolean;
    readonly hidden?: boolean;
};

export declare class SchematicEngine<CollectionT extends object, SchematicT extends object> implements Engine<CollectionT, SchematicT> {
    protected _workflow?: Workflow | undefined;
    readonly defaultMergeStrategy: MergeStrategy;
    readonly workflow: Workflow | null;
    constructor(_host: EngineHost<CollectionT, SchematicT>, _workflow?: Workflow | undefined);
    createCollection(name: string): Collection<CollectionT, SchematicT>;
    createContext(schematic: Schematic<CollectionT, SchematicT>, parent?: Partial<TypedSchematicContext<CollectionT, SchematicT>>, executionOptions?: Partial<ExecutionOptions>): TypedSchematicContext<CollectionT, SchematicT>;
    createSchematic(name: string, collection: Collection<CollectionT, SchematicT>, allowPrivate?: boolean): Schematic<CollectionT, SchematicT>;
    createSourceFromUrl(url: Url, context: TypedSchematicContext<CollectionT, SchematicT>): Source;
    executePostTasks(): Observable<void>;
    listSchematicNames(collection: Collection<CollectionT, SchematicT>): string[];
    transformOptions<OptionT extends object, ResultT extends object>(schematic: Schematic<CollectionT, SchematicT>, options: OptionT, context?: TypedSchematicContext<CollectionT, SchematicT>): Observable<ResultT>;
}

export declare class SchematicEngineConflictingException extends BaseException {
    constructor();
}

export declare class SchematicImpl<CollectionT extends object, SchematicT extends object> implements Schematic<CollectionT, SchematicT> {
    readonly collection: Collection<CollectionT, SchematicT>;
    readonly description: SchematicDescription<CollectionT, SchematicT>;
    constructor(_description: SchematicDescription<CollectionT, SchematicT>, _factory: RuleFactory<{}>, _collection: Collection<CollectionT, SchematicT>, _engine: Engine<CollectionT, SchematicT>);
    call<OptionT extends object>(options: OptionT, host: Observable<Tree>, parentContext?: Partial<TypedSchematicContext<CollectionT, SchematicT>>, executionOptions?: Partial<ExecutionOptions>): Observable<Tree>;
}

export declare class SchematicsException extends BaseException {
}

export declare abstract class SimpleSinkBase implements Sink {
    postCommit: () => void | Observable<void>;
    postCommitAction: (action: Action) => void | Observable<void>;
    preCommit: () => void | Observable<void>;
    preCommitAction: (action: Action) => void | Action | PromiseLike<Action> | Observable<Action>;
    protected abstract _createFile(path: string, content: Buffer): Observable<void>;
    protected abstract _deleteFile(path: string): Observable<void>;
    protected abstract _done(): Observable<void>;
    protected _fileAlreadyExistException(path: string): void;
    protected _fileDoesNotExistException(path: string): void;
    protected abstract _overwriteFile(path: string, content: Buffer): Observable<void>;
    protected abstract _renameFile(path: string, to: string): Observable<void>;
    protected _validateCreateAction(action: CreateFileAction): Observable<void>;
    protected _validateDeleteAction(action: DeleteFileAction): Observable<void>;
    protected abstract _validateFileExists(p: string): Observable<boolean>;
    protected _validateOverwriteAction(action: OverwriteFileAction): Observable<void>;
    protected _validateRenameAction(action: RenameFileAction): Observable<void>;
    commit(tree: Tree): Observable<void>;
    commitSingleAction(action: Action): Observable<void>;
    validateSingleAction(action: Action): Observable<void>;
}

export interface Sink {
    commit(tree: Tree): Observable<void>;
}

export declare function source(tree: Tree): Source;

export declare type Source = (context: SchematicContext) => Tree | Observable<Tree>;

export declare const standardFormats: schema.SchemaFormat[];

export interface TaskConfiguration<T = {}> {
    dependencies?: Array<TaskId>;
    name: string;
    options?: T;
}

export interface TaskConfigurationGenerator<T = {}> {
    toConfiguration(): TaskConfiguration<T>;
}

export declare type TaskExecutor<T = {}> = (options: T | undefined, context: SchematicContext) => Promise<void> | Observable<void>;

export interface TaskExecutorFactory<T> {
    readonly name: string;
    create(options?: T): Promise<TaskExecutor> | Observable<TaskExecutor>;
}

export interface TaskId {
    readonly id: number;
}

export interface TaskInfo {
    readonly configuration: TaskConfiguration;
    readonly context: SchematicContext;
    readonly id: number;
    readonly priority: number;
}

export declare class TaskScheduler {
    constructor(_context: SchematicContext);
    finalize(): ReadonlyArray<TaskInfo>;
    schedule<T>(taskConfiguration: TaskConfiguration<T>): TaskId;
}

export declare function template<T>(options: T): Rule;

export declare const TEMPLATE_FILENAME_RE: RegExp;

export declare type Tree = TreeInterface;

export interface TreeConstructor {
    branch(tree: TreeInterface): TreeInterface;
    empty(): TreeInterface;
    merge(tree: TreeInterface, other: TreeInterface, strategy?: MergeStrategy): TreeInterface;
    optimize(tree: TreeInterface): TreeInterface;
    partition(tree: TreeInterface, predicate: FilePredicate<boolean>): [TreeInterface, TreeInterface];
}

export declare const TreeSymbol: symbol;

export interface TypedSchematicContext<CollectionMetadataT extends object, SchematicMetadataT extends object> {
    readonly analytics?: analytics.Analytics;
    readonly debug: boolean;
    readonly engine: Engine<CollectionMetadataT, SchematicMetadataT>;
    readonly interactive: boolean;
    readonly logger: logging.LoggerApi;
    readonly schematic: Schematic<CollectionMetadataT, SchematicMetadataT>;
    readonly strategy: MergeStrategy;
    addTask<T>(task: TaskConfigurationGenerator<T>, dependencies?: Array<TaskId>): TaskId;
}

export declare class UnimplementedException extends BaseException {
    constructor();
}

export declare class UnknownActionException extends BaseException {
    constructor(action: Action);
}

export declare class UnknownCollectionException extends BaseException {
    constructor(name: string);
}

export declare class UnknownPipeException extends BaseException {
    constructor(name: string);
}

export declare class UnknownSchematicException extends BaseException {
    constructor(name: string, collection: CollectionDescription<{}>);
}

export declare class UnknownTaskDependencyException extends BaseException {
    constructor(id: TaskId);
}

export declare class UnknownUrlSourceProtocol extends BaseException {
    constructor(url: string);
}

export declare class UnregisteredTaskException extends BaseException {
    constructor(name: string, schematic?: SchematicDescription<{}, {}>);
}

export declare class UnsuccessfulWorkflowExecution extends BaseException {
    constructor();
}

export interface UpdateRecorder {
    insertLeft(index: number, content: Buffer | string): UpdateRecorder;
    insertRight(index: number, content: Buffer | string): UpdateRecorder;
    remove(index: number, length: number): UpdateRecorder;
}

export declare function url(urlString: string): Source;

export declare function when(predicate: FilePredicate<boolean>, operator: FileOperator): FileOperator;

export interface Workflow {
    readonly context: Readonly<WorkflowExecutionContext>;
    execute(options: Partial<WorkflowExecutionContext> & RequiredWorkflowExecutionContext): Observable<void>;
}

export interface WorkflowExecutionContext extends RequiredWorkflowExecutionContext {
    allowPrivate?: boolean;
    debug: boolean;
    logger: logging.Logger;
    parentContext?: Readonly<WorkflowExecutionContext>;
}
