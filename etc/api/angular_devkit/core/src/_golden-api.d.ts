export interface AdditionalPropertiesValidatorError extends SchemaValidatorErrorBase {
    keyword: 'additionalProperties';
    params: {
        additionalProperty: string;
    };
}

export declare function addUndefinedDefaults(value: JsonValue, _pointer: JsonPointer, schema?: JsonSchema): JsonValue;

export declare class AliasHost<StatsT extends object = {}> extends ResolverHost<StatsT> {
    protected _aliases: Map<Path, Path>;
    readonly aliases: Map<Path, Path>;
    protected _resolve(path: Path): Path;
}

export declare class AmbiguousProjectPathException extends BaseException {
    readonly path: Path;
    readonly projects: ReadonlyArray<string>;
    constructor(path: Path, projects: ReadonlyArray<string>);
}

export interface Analytics {
    event(category: string, action: string, options?: EventOptions): void;
    flush(): Promise<void>;
    pageview(path: string, options?: PageviewOptions): void;
    screenview(screenName: string, appName: string, options?: ScreenviewOptions): void;
    timing(category: string, variable: string, time: string | number, options?: TimingOptions): void;
}

export declare type AnalyticsForwarderFn = (report: JsonObject & AnalyticsReport) => void;

export declare type AnalyticsReport = AnalyticsReportEvent | AnalyticsReportScreenview | AnalyticsReportPageview | AnalyticsReportTiming;

export interface AnalyticsReportBase extends JsonObject {
    kind: AnalyticsReportKind;
}

export declare class AnalyticsReporter {
    protected _analytics: Analytics;
    constructor(_analytics: Analytics);
    report(report: AnalyticsReport): void;
}

export interface AnalyticsReportEvent extends AnalyticsReportBase {
    action: string;
    category: string;
    kind: AnalyticsReportKind.Event;
    options: JsonObject & EventOptions;
}

export declare enum AnalyticsReportKind {
    Event = "event",
    Screenview = "screenview",
    Pageview = "pageview",
    Timing = "timing"
}

export interface AnalyticsReportPageview extends AnalyticsReportBase {
    kind: AnalyticsReportKind.Pageview;
    options: JsonObject & PageviewOptions;
    path: string;
}

export interface AnalyticsReportScreenview extends AnalyticsReportBase {
    appName: string;
    kind: AnalyticsReportKind.Screenview;
    options: JsonObject & ScreenviewOptions;
    screenName: string;
}

export interface AnalyticsReportTiming extends AnalyticsReportBase {
    category: string;
    kind: AnalyticsReportKind.Timing;
    options: JsonObject & TimingOptions;
    time: string | number;
    variable: string;
}

export declare function asPosixPath(path: Path): PosixPath;

export declare function asWindowsPath(path: Path): WindowsPath;

export declare class BaseException extends Error {
    constructor(message?: string);
}

export declare function basename(path: Path): PathFragment;

export declare const bgBlack: (x: string) => string;

export declare const bgBlue: (x: string) => string;

export declare const bgCyan: (x: string) => string;

export declare const bgGreen: (x: string) => string;

export declare const bgMagenta: (x: string) => string;

export declare const bgRed: (x: string) => string;

export declare const bgWhite: (x: string) => string;

export declare const bgYellow: (x: string) => string;

export declare const black: (x: string) => string;

export declare const blue: (x: string) => string;

export declare const bold: (x: string) => string;

export declare function buildJsonPointer(fragments: string[]): JsonPointer;

export declare function camelize(str: string): string;

export declare function capitalize(str: string): string;

export declare class CircularDependencyFoundException extends BaseException {
    constructor();
}

export declare function classify(str: string): string;

export declare function clean<T>(array: Array<T | undefined>): Array<T>;

export declare namespace colors {
    const reset: (x: string) => string;
    const bold: (x: string) => string;
    const dim: (x: string) => string;
    const italic: (x: string) => string;
    const underline: (x: string) => string;
    const inverse: (x: string) => string;
    const hidden: (x: string) => string;
    const strikethrough: (x: string) => string;
    const black: (x: string) => string;
    const red: (x: string) => string;
    const green: (x: string) => string;
    const yellow: (x: string) => string;
    const blue: (x: string) => string;
    const magenta: (x: string) => string;
    const cyan: (x: string) => string;
    const white: (x: string) => string;
    const grey: (x: string) => string;
    const gray: (x: string) => string;
    const bgBlack: (x: string) => string;
    const bgRed: (x: string) => string;
    const bgGreen: (x: string) => string;
    const bgYellow: (x: string) => string;
    const bgBlue: (x: string) => string;
    const bgMagenta: (x: string) => string;
    const bgCyan: (x: string) => string;
    const bgWhite: (x: string) => string;
}

export declare class ContentHasMutatedException extends BaseException {
    constructor(path: string);
}

export declare class CordHost extends SimpleMemoryHost {
    protected _back: ReadonlyHost;
    protected _filesToCreate: Set<Path>;
    protected _filesToDelete: Set<Path>;
    protected _filesToOverwrite: Set<Path>;
    protected _filesToRename: Map<Path, Path>;
    protected _filesToRenameRevert: Map<Path, Path>;
    readonly backend: ReadonlyHost;
    readonly capabilities: HostCapabilities;
    constructor(_back: ReadonlyHost);
    clone(): CordHost;
    commit(host: Host, force?: boolean): Observable<void>;
    create(path: Path, content: FileBuffer): Observable<void>;
    delete(path: Path): Observable<void>;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    overwrite(path: Path, content: FileBuffer): Observable<void>;
    read(path: Path): Observable<FileBuffer>;
    records(): CordHostRecord[];
    rename(from: Path, to: Path): Observable<void>;
    stat(path: Path): Observable<Stats | null> | null;
    watch(path: Path, options?: HostWatchOptions): null;
    willCreate(path: Path): boolean;
    willDelete(path: Path): boolean;
    willOverwrite(path: Path): boolean;
    willRename(path: Path): boolean;
    willRenameTo(path: Path, to: Path): boolean;
    write(path: Path, content: FileBuffer): Observable<void>;
}

export interface CordHostCreate {
    content: FileBuffer;
    kind: 'create';
    path: Path;
}

export interface CordHostDelete {
    kind: 'delete';
    path: Path;
}

export interface CordHostOverwrite {
    content: FileBuffer;
    kind: 'overwrite';
    path: Path;
}

export declare type CordHostRecord = CordHostCreate | CordHostOverwrite | CordHostRename | CordHostDelete;

export interface CordHostRename {
    from: Path;
    kind: 'rename';
    to: Path;
}

export declare class CoreSchemaRegistry implements SchemaRegistry {
    constructor(formats?: SchemaFormat[]);
    protected _resolver(ref: string, validate: ajv.ValidateFunction): {
        context?: ajv.ValidateFunction;
        schema?: JsonObject;
    };
    addFormat(format: SchemaFormat): void;
    addPostTransform(visitor: JsonVisitor, deps?: JsonVisitor[]): void;
    addPreTransform(visitor: JsonVisitor, deps?: JsonVisitor[]): void;
    addSmartDefaultProvider<T>(source: string, provider: SmartDefaultProvider<T>): void;
    compile(schema: JsonSchema): Observable<SchemaValidator>;
    flatten(schema: JsonObject): Observable<JsonObject>;
    registerUriHandler(handler: UriHandler): void;
    usePromptProvider(provider: PromptProvider): void;
}

export declare function createWorkspaceHost(host: virtualFs.Host): WorkspaceHost;

export interface CustomDimensionsAndMetricsOptions {
    dimensions?: (boolean | number | string)[];
    metrics?: (boolean | number | string)[];
}

export declare const cyan: (x: string) => string;

export declare function dasherize(str: string): string;

export declare function decamelize(str: string): string;

export declare function deepCopy<T extends any>(value: T): T;

export declare type DefinitionCollectionListener<V extends object> = (name: string, action: 'add' | 'remove' | 'replace', newValue: V | undefined, oldValue: V | undefined, collection: DefinitionCollection<V>) => void;

export declare class DependencyNotFoundException extends BaseException {
    constructor();
}

export declare const dim: (x: string) => string;

export declare function dirname(path: Path): Path;

export declare class Empty implements ReadonlyHost {
    readonly capabilities: HostCapabilities;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    read(path: Path): Observable<FileBuffer>;
    stat(path: Path): Observable<Stats<{}> | null>;
}

export interface EventOptions extends CustomDimensionsAndMetricsOptions {
    label?: string;
    value?: string;
}

export declare function extname(path: Path): string;

export declare class FileAlreadyExistException extends BaseException {
    constructor(path: string);
}

export declare const fileBuffer: TemplateTag<FileBuffer>;

export declare type FileBuffer = ArrayBuffer;

export declare type FileBufferLike = ArrayBufferLike;

export declare function fileBufferToString(fileBuffer: FileBuffer): string;

export declare class FileDoesNotExistException extends BaseException {
    constructor(path: string);
}

export interface FormatValidatorError extends SchemaValidatorErrorBase {
    keyword: 'format';
    params: {
        format: string;
    };
}

export declare class ForwardingAnalytics implements Analytics {
    protected _fn: AnalyticsForwarderFn;
    constructor(_fn: AnalyticsForwarderFn);
    event(category: string, action: string, options?: EventOptions): void;
    flush(): Promise<void>;
    pageview(path: string, options?: PageviewOptions): void;
    screenview(screenName: string, appName: string, options?: ScreenviewOptions): void;
    timing(category: string, variable: string, time: string | number, options?: TimingOptions): void;
}

export declare function fragment(path: string): PathFragment;

export declare function getSystemPath(path: Path): string;

export declare function getTypesOfSchema(schema: JsonSchema): Set<string>;

export declare const gray: (x: string) => string;

export declare const green: (x: string) => string;

export declare const grey: (x: string) => string;

export declare const hidden: (x: string) => string;

export interface Host<StatsT extends object = {}> extends ReadonlyHost<StatsT> {
    delete(path: Path): Observable<void>;
    rename(from: Path, to: Path): Observable<void>;
    watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null;
    write(path: Path, content: FileBufferLike): Observable<void>;
}

export interface HostCapabilities {
    synchronous: boolean;
}

export interface HostWatchEvent {
    readonly path: Path;
    readonly time: Date;
    readonly type: HostWatchEventType;
}

export declare const enum HostWatchEventType {
    Changed = 0,
    Created = 1,
    Deleted = 2,
    Renamed = 3
}

export interface HostWatchOptions {
    readonly persistent?: boolean;
    readonly recursive?: boolean;
}

export declare function indentBy(indentations: number): TemplateTag;

export declare class IndentLogger extends Logger {
    constructor(name: string, parent?: Logger | null, indentation?: string);
}

export declare class InvalidJsonCharacterException extends JsonException {
    character: number;
    invalidChar: string;
    line: number;
    offset: number;
    constructor(context: JsonParserContext);
}

export declare class InvalidPathException extends BaseException {
    constructor(path: string);
}

export declare class InvalidUpdateRecordException extends BaseException {
    constructor();
}

export declare const inverse: (x: string) => string;

export declare function isAbsolute(p: Path): boolean;

export declare function isJsonArray(value: JsonValue): value is JsonArray;

export declare function isJsonObject(value: JsonValue): value is JsonObject;

export declare function isObservable(obj: any | Observable<any>): obj is Observable<any>;

export declare function isPromise(obj: any): obj is Promise<any>;

export declare const italic: (x: string) => string;

export declare function join(p1: Path, ...others: string[]): Path;

export declare function joinJsonPointer(root: JsonPointer, ...others: string[]): JsonPointer;

export interface JsonArray extends Array<JsonValue> {
}

export interface JsonAstArray extends JsonAstNodeBase {
    readonly elements: JsonAstNode[];
    readonly kind: 'array';
    readonly value: JsonArray;
}

export interface JsonAstComment extends JsonAstNodeBase {
    readonly content: string;
    readonly kind: 'comment';
}

export interface JsonAstConstantFalse extends JsonAstNodeBase {
    readonly kind: 'false';
    readonly value: false;
}

export interface JsonAstConstantNull extends JsonAstNodeBase {
    readonly kind: 'null';
    readonly value: null;
}

export interface JsonAstConstantTrue extends JsonAstNodeBase {
    readonly kind: 'true';
    readonly value: true;
}

export interface JsonAstIdentifier extends JsonAstNodeBase {
    readonly kind: 'identifier';
    readonly value: string;
}

export interface JsonAstKeyValue extends JsonAstNodeBase {
    readonly key: JsonAstString | JsonAstIdentifier;
    readonly kind: 'keyvalue';
    readonly value: JsonAstNode;
}

export interface JsonAstMultilineComment extends JsonAstNodeBase {
    readonly content: string;
    readonly kind: 'multicomment';
}

export declare type JsonAstNode = JsonAstNumber | JsonAstString | JsonAstIdentifier | JsonAstArray | JsonAstObject | JsonAstConstantFalse | JsonAstConstantNull | JsonAstConstantTrue;

export interface JsonAstNodeBase {
    readonly comments?: (JsonAstComment | JsonAstMultilineComment)[];
    readonly end: Position;
    readonly start: Position;
    readonly text: string;
}

export interface JsonAstNumber extends JsonAstNodeBase {
    readonly kind: 'number';
    readonly value: number;
}

export interface JsonAstObject extends JsonAstNodeBase {
    readonly kind: 'object';
    readonly properties: JsonAstKeyValue[];
    readonly value: JsonObject;
}

export interface JsonAstString extends JsonAstNodeBase {
    readonly kind: 'string';
    readonly value: string;
}

export declare class JsonException extends BaseException {
}

export interface JsonObject {
    [prop: string]: JsonValue;
}

export declare enum JsonParseMode {
    Strict = 0,
    CommentsAllowed = 1,
    SingleQuotesAllowed = 2,
    IdentifierKeyNamesAllowed = 4,
    TrailingCommasAllowed = 8,
    HexadecimalNumberAllowed = 16,
    MultiLineStringAllowed = 32,
    LaxNumberParsingAllowed = 64,
    NumberConstantsAllowed = 128,
    Default = 0,
    Loose = 255,
    Json = 0,
    Json5 = 255
}

export interface JsonParserContext {
    readonly mode: JsonParseMode;
    readonly original: string;
    position: Position;
    previous: Position;
}

export declare type JsonPointer = string & {
    __PRIVATE_DEVKIT_JSON_POINTER: void;
};

export interface JsonSchemaVisitor {
    (current: JsonObject | JsonArray, pointer: JsonPointer, parentSchema?: JsonObject | JsonArray, index?: string): void;
}

export declare type JsonValue = JsonAstNode['value'];

export interface JsonVisitor {
    (value: JsonValue, pointer: JsonPointer, schema?: JsonObject, root?: JsonObject | JsonArray): Observable<JsonValue> | JsonValue;
}

export declare class LevelCapLogger extends LevelTransformLogger {
    readonly levelCap: LogLevel;
    readonly name: string;
    readonly parent: Logger | null;
    constructor(name: string, parent: Logger | null, levelCap: LogLevel);
    static levelMap: {
        [cap: string]: {
            [level: string]: string;
        };
    };
}

export declare class LevelTransformLogger extends Logger {
    readonly levelTransform: (level: LogLevel) => LogLevel;
    readonly name: string;
    readonly parent: Logger | null;
    constructor(name: string, parent: Logger | null, levelTransform: (level: LogLevel) => LogLevel);
    createChild(name: string): Logger;
    log(level: LogLevel, message: string, metadata?: JsonObject): void;
}

export declare function levenshtein(a: string, b: string): number;

export interface LimitValidatorError extends SchemaValidatorErrorBase {
    keyword: 'maxItems' | 'minItems' | 'maxLength' | 'minLength' | 'maxProperties' | 'minProperties';
    params: {
        limit: number;
    };
}

export interface LogEntry extends LoggerMetadata {
    level: LogLevel;
    message: string;
    timestamp: number;
}

export declare class Logger extends Observable<LogEntry> implements LoggerApi {
    protected _metadata: LoggerMetadata;
    protected _observable: Observable<LogEntry>;
    protected readonly _subject: Subject<LogEntry>;
    readonly name: string;
    readonly parent: Logger | null;
    constructor(name: string, parent?: Logger | null);
    asApi(): LoggerApi;
    complete(): void;
    createChild(name: string): Logger;
    debug(message: string, metadata?: JsonObject): void;
    error(message: string, metadata?: JsonObject): void;
    fatal(message: string, metadata?: JsonObject): void;
    forEach(next: (value: LogEntry) => void, PromiseCtor?: typeof Promise): Promise<void>;
    info(message: string, metadata?: JsonObject): void;
    lift<R>(operator: Operator<LogEntry, R>): Observable<R>;
    log(level: LogLevel, message: string, metadata?: JsonObject): void;
    next(entry: LogEntry): void;
    subscribe(): Subscription;
    subscribe(observer: PartialObserver<LogEntry>): Subscription;
    subscribe(next?: (value: LogEntry) => void, error?: (error: Error) => void, complete?: () => void): Subscription;
    toString(): string;
    warn(message: string, metadata?: JsonObject): void;
}

export interface LoggerApi {
    createChild(name: string): Logger;
    debug(message: string, metadata?: JsonObject): void;
    error(message: string, metadata?: JsonObject): void;
    fatal(message: string, metadata?: JsonObject): void;
    info(message: string, metadata?: JsonObject): void;
    log(level: LogLevel, message: string, metadata?: JsonObject): void;
    warn(message: string, metadata?: JsonObject): void;
}

export interface LoggerMetadata extends JsonObject {
    name: string;
    path: string[];
}

export declare class LoggingAnalytics implements Analytics {
    protected _logger: Logger;
    constructor(_logger: Logger);
    event(category: string, action: string, options?: EventOptions): void;
    flush(): Promise<void>;
    pageview(path: string, options?: PageviewOptions): void;
    screenview(screenName: string, appName: string, options?: ScreenviewOptions): void;
    timing(category: string, variable: string, time: string | number, options?: TimingOptions): void;
}

export declare type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export declare const magenta: (x: string) => string;

export declare function mapObject<T, V>(obj: {
    [k: string]: T;
}, mapper: (k: string, v: T) => V): {
    [k: string]: V;
};

export declare class MergeConflictException extends BaseException {
    constructor(path: string);
}

export declare class MultiAnalytics implements Analytics {
    protected _backends: Analytics[];
    constructor(_backends?: Analytics[]);
    event(category: string, action: string, options?: EventOptions): void;
    flush(): Promise<void>;
    pageview(path: string, options?: PageviewOptions): void;
    push(...backend: Analytics[]): void;
    screenview(screenName: string, appName: string, options?: ScreenviewOptions): void;
    timing(category: string, variable: string, time: string | number, options?: TimingOptions): void;
}

export declare enum NgCliAnalyticsDimensions {
    CpuCount = 1,
    CpuSpeed = 2,
    RamInGigabytes = 3,
    NodeVersion = 4,
    NgAddCollection = 6,
    NgBuildBuildEventLog = 7,
    BuildErrors = 20
}

export declare const NgCliAnalyticsDimensionsFlagInfo: {
    [name: string]: [string, string];
};

export declare enum NgCliAnalyticsMetrics {
    NgComponentCount = 1,
    UNUSED_2 = 2,
    UNUSED_3 = 3,
    UNUSED_4 = 4,
    BuildTime = 5,
    NgOnInitCount = 6,
    InitialChunkSize = 7,
    TotalChunkCount = 8,
    TotalChunkSize = 9,
    LazyChunkCount = 10,
    LazyChunkSize = 11,
    AssetCount = 12,
    AssetSize = 13,
    PolyfillSize = 14,
    CssSize = 15
}

export declare const NgCliAnalyticsMetricsFlagInfo: {
    [name: string]: [string, string];
};

export declare function noCacheNormalize(path: string): Path;

export declare class NoopAnalytics implements Analytics {
    event(): void;
    flush(): Promise<void>;
    pageview(): void;
    screenview(): void;
    timing(): void;
}

export declare function normalize(path: string): Path;

export declare const NormalizedRoot: Path;

export declare const NormalizedSep: Path;

export declare class NullLogger extends Logger {
    constructor(parent?: Logger | null);
    asApi(): LoggerApi;
}

export declare function oneLine(strings: TemplateStringsArray, ...values: any[]): string;

export interface PageviewOptions extends CustomDimensionsAndMetricsOptions {
    hostname?: string;
    title?: string;
}

export declare function parseJson(input: string, mode?: JsonParseMode, options?: ParseJsonOptions): JsonValue;

export declare function parseJsonAst(input: string, mode?: JsonParseMode): JsonAstNode;

export interface ParseJsonOptions {
    path?: string;
}

export declare function parseJsonPointer(pointer: JsonPointer): string[];

export declare class PartiallyOrderedSet<T> implements Set<T> {
    readonly [Symbol.toStringTag]: 'Set';
    readonly size: number;
    [Symbol.iterator](): IterableIterator<T>;
    protected _checkCircularDependencies(item: T, deps: Set<T>): void;
    add(item: T, deps?: (Set<T> | T[])): this;
    clear(): void;
    delete(item: T): boolean;
    entries(): IterableIterator<[T, T]>;
    forEach(callbackfn: (value: T, value2: T, set: PartiallyOrderedSet<T>) => void, thisArg?: any): void;
    has(item: T): boolean;
    keys(): IterableIterator<T>;
    values(): IterableIterator<T>;
}

export declare const path: TemplateTag<Path>;

export declare type Path = string & {
    __PRIVATE_DEVKIT_PATH: void;
};

export declare class PathCannotBeFragmentException extends BaseException {
    constructor(path: string);
}

export declare type PathFragment = Path & {
    __PRIVATE_DEVKIT_PATH_FRAGMENT: void;
};

export declare class PathIsDirectoryException extends BaseException {
    constructor(path: string);
}

export declare class PathIsFileException extends BaseException {
    constructor(path: string);
}

export declare class PathMustBeAbsoluteException extends BaseException {
    constructor(path: string);
}

export declare class PathSpecificJsonException extends JsonException {
    exception: JsonException;
    path: string;
    constructor(path: string, exception: JsonException);
}

export declare class PatternMatchingHost<StatsT extends object = {}> extends ResolverHost<StatsT> {
    protected _patterns: Map<RegExp, ReplacementFunction>;
    protected _resolve(path: Path): Path;
    addPattern(pattern: string | string[], replacementFn: ReplacementFunction): void;
}

export interface Position {
    readonly character: number;
    readonly line: number;
    readonly offset: number;
}

export declare type PosixPath = string & {
    __PRIVATE_DEVKIT_POSIX_PATH: void;
};

export declare class PriorityQueue<T> {
    readonly size: number;
    constructor(_comparator: (x: T, y: T) => number);
    clear(): void;
    peek(): T | undefined;
    pop(): T | undefined;
    push(item: T): void;
    toArray(): Array<T>;
}

export interface ProjectDefinition {
    readonly extensions: Record<string, JsonValue | undefined>;
    prefix?: string;
    root: string;
    sourceRoot?: string;
    readonly targets: TargetDefinitionCollection;
}

export declare class ProjectDefinitionCollection extends DefinitionCollection<ProjectDefinition> {
    constructor(initial?: Record<string, ProjectDefinition>, listener?: DefinitionCollectionListener<ProjectDefinition>);
    add(definition: {
        name: string;
        root: string;
        sourceRoot?: string;
        prefix?: string;
        targets?: Record<string, TargetDefinition | undefined>;
        [key: string]: unknown;
    }): ProjectDefinition;
    set(name: string, value: ProjectDefinition): this;
}

export declare class ProjectNotFoundException extends BaseException {
    constructor(name: string);
}

export declare class ProjectToolNotFoundException extends BaseException {
    constructor(name: string);
}

export interface PromptDefinition {
    default?: string | string[] | number | boolean | null;
    id: string;
    items?: Array<string | {
        value: JsonValue;
        label: string;
    }>;
    message: string;
    multiselect?: boolean;
    raw?: string | JsonObject;
    type: string;
    validator?: (value: JsonValue) => boolean | string | Promise<boolean | string>;
}

export declare type PromptProvider = (definitions: Array<PromptDefinition>) => SubscribableOrPromise<{
    [id: string]: JsonValue;
}>;

export interface ReadonlyHost<StatsT extends object = {}> {
    readonly capabilities: HostCapabilities;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    read(path: Path): Observable<FileBuffer>;
    stat(path: Path): Observable<Stats<StatsT> | null> | null;
}

export declare function readWorkspace(path: string, host: WorkspaceHost, format?: WorkspaceFormat): Promise<{
    workspace: WorkspaceDefinition;
}>;

export declare const red: (x: string) => string;

export interface ReferenceResolver<ContextT> {
    (ref: string, context?: ContextT): {
        context?: ContextT;
        schema?: JsonObject;
    };
}

export interface RefValidatorError extends SchemaValidatorErrorBase {
    keyword: '$ref';
    params: {
        ref: string;
    };
}

export declare function relative(from: Path, to: Path): Path;

export declare type ReplacementFunction = (path: Path) => Path;

export interface RequiredValidatorError extends SchemaValidatorErrorBase {
    keyword: 'required';
    params: {
        missingProperty: string;
    };
}

export declare const reset: (x: string) => string;

export declare function resetNormalizeCache(): void;

export declare function resolve(p1: Path, p2: Path): Path;

export declare abstract class ResolverHost<T extends object> implements Host<T> {
    protected _delegate: Host<T>;
    readonly capabilities: HostCapabilities;
    constructor(_delegate: Host<T>);
    protected abstract _resolve(path: Path): Path;
    delete(path: Path): Observable<void>;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    read(path: Path): Observable<FileBuffer>;
    rename(from: Path, to: Path): Observable<void>;
    stat(path: Path): Observable<Stats<T> | null> | null;
    watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null;
    write(path: Path, content: FileBuffer): Observable<void>;
}

export declare class SafeReadonlyHost<StatsT extends object = {}> implements ReadonlyHost<StatsT> {
    readonly capabilities: HostCapabilities;
    constructor(_delegate: ReadonlyHost<StatsT>);
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    read(path: Path): Observable<FileBuffer>;
    stat(path: Path): Observable<Stats<StatsT> | null> | null;
}

export interface SchemaFormat {
    formatter: SchemaFormatter;
    name: string;
}

export interface SchemaFormatter {
    readonly async: boolean;
    validate(data: any): boolean | Observable<boolean>;
}

export interface SchemaKeywordValidator {
    (data: JsonValue, schema: JsonValue, parent: JsonObject | JsonArray | undefined, parentProperty: string | number | undefined, pointer: JsonPointer, rootData: JsonValue): boolean | Observable<boolean>;
}

export interface SchemaRegistry {
    addFormat(format: SchemaFormat): void;
    addPostTransform(visitor: JsonVisitor, deps?: JsonVisitor[]): void;
    addPreTransform(visitor: JsonVisitor, deps?: JsonVisitor[]): void;
    addSmartDefaultProvider<T>(source: string, provider: SmartDefaultProvider<T>): void;
    compile(schema: Object): Observable<SchemaValidator>;
    flatten(schema: JsonObject | string): Observable<JsonObject>;
    usePromptProvider(provider: PromptProvider): void;
}

export declare class SchemaValidationException extends BaseException {
    readonly errors: SchemaValidatorError[];
    constructor(errors?: SchemaValidatorError[], baseMessage?: string);
    static createMessages(errors?: SchemaValidatorError[]): string[];
}

export interface SchemaValidator {
    (data: JsonValue, options?: SchemaValidatorOptions): Observable<SchemaValidatorResult>;
}

export declare type SchemaValidatorError = RefValidatorError | LimitValidatorError | AdditionalPropertiesValidatorError | FormatValidatorError | RequiredValidatorError;

export interface SchemaValidatorErrorBase {
    data?: JsonValue;
    dataPath: string;
    keyword: string;
    message?: string;
}

export interface SchemaValidatorOptions {
    applyPostTransforms?: boolean;
    applyPreTransforms?: boolean;
    withPrompts?: boolean;
}

export interface SchemaValidatorResult {
    data: JsonValue;
    errors?: SchemaValidatorError[];
    success: boolean;
}

export declare class ScopedHost<T extends object> extends ResolverHost<T> {
    protected _root: Path;
    constructor(delegate: Host<T>, _root?: Path);
    protected _resolve(path: Path): Path;
}

export interface ScreenviewOptions extends CustomDimensionsAndMetricsOptions {
    appId?: string;
    appInstallerId?: string;
    appVersion?: string;
}

export declare class SimpleMemoryHost implements Host<{}> {
    protected _cache: Map<Path, Stats<SimpleMemoryHostStats>>;
    readonly capabilities: HostCapabilities;
    constructor();
    protected _delete(path: Path): void;
    protected _exists(path: Path): boolean;
    protected _isDirectory(path: Path): boolean;
    protected _isFile(path: Path): boolean;
    protected _list(path: Path): PathFragment[];
    protected _newDirStats(): {
        inspect(): string;
        isFile(): boolean;
        isDirectory(): boolean;
        size: number;
        atime: Date;
        ctime: Date;
        mtime: Date;
        birthtime: Date;
        content: null;
    };
    protected _newFileStats(content: FileBuffer, oldStats?: Stats<SimpleMemoryHostStats>): {
        inspect(): string;
        isFile(): boolean;
        isDirectory(): boolean;
        size: number;
        atime: Date;
        ctime: Date;
        mtime: Date;
        birthtime: Date;
        content: ArrayBuffer;
    };
    protected _read(path: Path): FileBuffer;
    protected _rename(from: Path, to: Path): void;
    protected _stat(path: Path): Stats<SimpleMemoryHostStats> | null;
    protected _toAbsolute(path: Path): Path;
    protected _updateWatchers(path: Path, type: HostWatchEventType): void;
    protected _watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent>;
    protected _write(path: Path, content: FileBuffer): void;
    delete(path: Path): Observable<void>;
    exists(path: Path): Observable<boolean>;
    isDirectory(path: Path): Observable<boolean>;
    isFile(path: Path): Observable<boolean>;
    list(path: Path): Observable<PathFragment[]>;
    read(path: Path): Observable<FileBuffer>;
    rename(from: Path, to: Path): Observable<void>;
    reset(): void;
    stat(path: Path): Observable<Stats<{}> | null> | null;
    watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null;
    write(path: Path, content: FileBuffer): Observable<void>;
}

export interface SimpleMemoryHostStats {
    readonly content: FileBuffer | null;
}

export interface SmartDefaultProvider<T> {
    (schema: JsonObject): T | Observable<T>;
}

export declare function split(path: Path): PathFragment[];

export declare type Stats<T extends object = {}> = T & {
    isFile(): boolean;
    isDirectory(): boolean;
    readonly size: number;
    readonly atime: Date;
    readonly mtime: Date;
    readonly ctime: Date;
    readonly birthtime: Date;
};

export declare const strikethrough: (x: string) => string;

export declare function stringToFileBuffer(str: string): FileBuffer;

export declare function stripIndent(strings: TemplateStringsArray, ...values: any[]): string;

export declare function stripIndents(strings: TemplateStringsArray, ...values: any[]): string;

export declare class SyncDelegateHost<T extends object = {}> {
    protected _delegate: Host<T>;
    readonly capabilities: HostCapabilities;
    readonly delegate: Host<T>;
    constructor(_delegate: Host<T>);
    protected _doSyncCall<ResultT>(observable: Observable<ResultT>): ResultT;
    delete(path: Path): void;
    exists(path: Path): boolean;
    isDirectory(path: Path): boolean;
    isFile(path: Path): boolean;
    list(path: Path): PathFragment[];
    read(path: Path): FileBuffer;
    rename(from: Path, to: Path): void;
    stat(path: Path): Stats<T> | null;
    watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null;
    write(path: Path, content: FileBufferLike): void;
}

export declare class SynchronousDelegateExpectedException extends BaseException {
    constructor();
}

export interface TargetDefinition {
    builder: string;
    configurations?: Record<string, Record<string, JsonValue | undefined> | undefined>;
    options?: Record<string, JsonValue | undefined>;
}

export declare class TargetDefinitionCollection extends DefinitionCollection<TargetDefinition> {
    constructor(initial?: Record<string, TargetDefinition>, listener?: DefinitionCollectionListener<TargetDefinition>);
    add(definition: {
        name: string;
    } & TargetDefinition): TargetDefinition;
    set(name: string, value: TargetDefinition): this;
}

export declare function template<T>(content: string, options?: TemplateOptions): (input: T) => string;

export interface TemplateAst {
    children: TemplateAstNode[];
    content: string;
    fileName: string;
}

export interface TemplateAstBase {
    end: Position;
    start: Position;
}

export interface TemplateAstComment extends TemplateAstBase {
    kind: 'comment';
    text: string;
}

export interface TemplateAstContent extends TemplateAstBase {
    content: string;
    kind: 'content';
}

export interface TemplateAstEscape extends TemplateAstBase {
    expression: string;
    kind: 'escape';
}

export interface TemplateAstEvaluate extends TemplateAstBase {
    expression: string;
    kind: 'evaluate';
}

export interface TemplateAstInterpolate extends TemplateAstBase {
    expression: string;
    kind: 'interpolate';
}

export declare type TemplateAstNode = TemplateAstContent | TemplateAstEvaluate | TemplateAstComment | TemplateAstEscape | TemplateAstInterpolate;

export interface TemplateOptions {
    fileName?: string;
    module?: boolean | {
        exports: {};
    };
    sourceMap?: boolean;
    sourceRoot?: string;
    sourceURL?: string;
}

export declare function templateParser(sourceText: string, fileName: string): TemplateAst;

export interface TemplateTag<R = string> {
    (template: TemplateStringsArray, ...substitutions: any[]): R;
}

export declare namespace test {
    type TestLogRecord = {
        kind: 'write' | 'read' | 'delete' | 'list' | 'exists' | 'isDirectory' | 'isFile' | 'stat' | 'watch';
        path: Path;
    } | {
        kind: 'rename';
        from: Path;
        to: Path;
    };
    class TestHost extends SimpleMemoryHost {
        protected _records: TestLogRecord[];
        protected _sync: SyncDelegateHost<{}>;
        readonly files: Path[];
        readonly records: TestLogRecord[];
        readonly sync: SyncDelegateHost<{}>;
        constructor(map?: {
            [path: string]: string;
        });
        $exists(path: string): boolean;
        $isDirectory(path: string): boolean;
        $isFile(path: string): boolean;
        $list(path: string): PathFragment[];
        $read(path: string): string;
        $write(path: string, content: string): void;
        protected _delete(path: Path): void;
        protected _exists(path: Path): boolean;
        protected _isDirectory(path: Path): boolean;
        protected _isFile(path: Path): boolean;
        protected _list(path: Path): PathFragment[];
        protected _read(path: Path): ArrayBuffer;
        protected _rename(from: Path, to: Path): void;
        protected _stat(path: Path): Stats<SimpleMemoryHostStats> | null;
        protected _watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent>;
        protected _write(path: Path, content: FileBuffer): void;
        clearRecords(): void;
        clone(): TestHost;
    }
}

export interface TimingOptions extends CustomDimensionsAndMetricsOptions {
    label?: string;
}

export declare class TransformLogger extends Logger {
    constructor(name: string, transform: (stream: Observable<LogEntry>) => Observable<LogEntry>, parent?: Logger | null);
}

export declare function trimNewlines(strings: TemplateStringsArray, ...values: any[]): string;

export declare const underline: (x: string) => string;

export declare function underscore(str: string): string;

export declare class UnexpectedEndOfInputException extends JsonException {
    constructor(_context: JsonParserContext);
}

export declare class UnimplementedException extends BaseException {
    constructor();
}

export declare class UnknownException extends BaseException {
    constructor(message: string);
}

export declare class UnsupportedPlatformException extends BaseException {
    constructor();
}

export declare type UriHandler = (uri: string) => Observable<JsonObject> | Promise<JsonObject> | null | undefined;

export declare function visitJson<ContextT>(json: JsonValue, visitor: JsonVisitor, schema?: JsonSchema, refResolver?: ReferenceResolver<ContextT>, context?: ContextT): Observable<JsonValue>;

export declare function visitJsonSchema(schema: JsonSchema, visitor: JsonSchemaVisitor): void;

export declare const white: (x: string) => string;

export declare type WindowsPath = string & {
    __PRIVATE_DEVKIT_WINDOWS_PATH: void;
};

export declare class Workspace {
    readonly host: virtualFs.Host<{}>;
    readonly newProjectRoot: string | undefined;
    readonly root: Path;
    readonly version: number;
    constructor(_root: Path, _host: virtualFs.Host<{}>, registry?: schema.CoreSchemaRegistry);
    getCli(): WorkspaceTool;
    getDefaultProjectName(): string | null;
    getProject(projectName: string): WorkspaceProject;
    getProjectByPath(path: Path): string | null;
    getProjectCli(projectName: string): WorkspaceTool;
    getProjectSchematics(projectName: string): WorkspaceTool;
    getProjectTargets(projectName: string): WorkspaceTool;
    getSchematics(): WorkspaceTool;
    getTargets(): WorkspaceTool;
    listProjectNames(): string[];
    loadWorkspaceFromHost(workspacePath: Path): Observable<this>;
    loadWorkspaceFromJson(json: {}): Observable<this>;
    validateAgainstSchema<T = {}>(contentJson: {}, schemaJson: JsonObject): Observable<T>;
    protected static _workspaceFileNames: string[];
    static findWorkspaceFile(host: virtualFs.Host<{}>, path: Path): Promise<Path | null>;
    static fromPath(host: virtualFs.Host<{}>, path: Path, registry: schema.CoreSchemaRegistry): Promise<Workspace>;
}

export interface WorkspaceDefinition {
    readonly extensions: Record<string, JsonValue | undefined>;
    readonly projects: ProjectDefinitionCollection;
}

export declare class WorkspaceFileNotFoundException extends BaseException {
    constructor(path: Path);
}

export declare enum WorkspaceFormat {
    JSON = 0
}

export interface WorkspaceHost {
    isDirectory(path: string): Promise<boolean>;
    isFile(path: string): Promise<boolean>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
}

export declare class WorkspaceNotYetLoadedException extends BaseException {
    constructor();
}

export interface WorkspaceProject {
    architect?: WorkspaceTool;
    cli?: WorkspaceTool;
    prefix: string;
    projectType: "application" | "library";
    root: string;
    schematics?: WorkspaceTool;
    sourceRoot?: string;
    targets?: WorkspaceTool;
}

export interface WorkspaceSchema {
    $schema?: string;
    architect?: WorkspaceTool;
    cli?: WorkspaceTool;
    defaultProject?: string;
    newProjectRoot?: string;
    projects: {
        [k: string]: WorkspaceProject;
    };
    schematics?: WorkspaceTool;
    targets?: WorkspaceTool;
    version: number;
}

export interface WorkspaceTool {
    $schema?: string;
    [k: string]: any;
}

export declare class WorkspaceToolNotFoundException extends BaseException {
    constructor(name: string);
}

export declare function writeWorkspace(workspace: WorkspaceDefinition, host: WorkspaceHost, path?: string, format?: WorkspaceFormat): Promise<void>;

export declare const yellow: (x: string) => string;
