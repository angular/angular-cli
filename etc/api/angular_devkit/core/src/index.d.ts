export declare function asPosixPath(path: Path): PosixPath;

export declare function asWindowsPath(path: Path): WindowsPath;

export declare class BaseException extends Error {
    constructor(message?: string);
}

export declare function basename(path: Path): PathFragment;

export declare class CircularDependencyFoundException extends BaseException {
    constructor();
}

export declare function clean<T>(array: Array<T | undefined>): Array<T>;

export declare class ContentHasMutatedException extends BaseException {
    constructor(path: string);
}

export declare function deepCopy<T extends any>(value: T): T;

export declare class DependencyNotFoundException extends BaseException {
    constructor();
}

export declare function dirname(path: Path): Path;

export declare function extname(path: Path): string;

export declare class FileAlreadyExistException extends BaseException {
    constructor(path: string);
}

export declare class FileDoesNotExistException extends BaseException {
    constructor(path: string);
}

export declare function fragment(path: string): PathFragment;

export declare function getSystemPath(path: Path): string;

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

export declare function isAbsolute(p: Path): boolean;

export declare function isJsonArray(value: JsonValue): value is JsonArray;

export declare function isJsonObject(value: JsonValue): value is JsonObject;

export declare function isObservable(obj: any | Observable<any>): obj is Observable<any>;

export declare function isPromise(obj: any): obj is Promise<any>;

export declare function join(p1: Path, ...others: string[]): Path;

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

export declare type JsonValue = JsonAstNode['value'];

export declare function mapObject<T, V>(obj: {
    [k: string]: T;
}, mapper: (k: string, v: T) => V): {
    [k: string]: V;
};

export declare class MergeConflictException extends BaseException {
    constructor(path: string);
}

export declare function noCacheNormalize(path: string): Path;

export declare function normalize(path: string): Path;

export declare const NormalizedRoot: Path;

export declare const NormalizedSep: Path;

export declare function parseJson(input: string, mode?: JsonParseMode, options?: ParseJsonOptions): JsonValue;

export declare function parseJsonAst(input: string, mode?: JsonParseMode): JsonAstNode;

export interface ParseJsonOptions {
    path?: string;
}

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

export declare function relative(from: Path, to: Path): Path;

export declare function resetNormalizeCache(): void;

export declare function resolve(p1: Path, p2: Path): Path;

export declare function split(path: Path): PathFragment[];

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

export declare class UnexpectedEndOfInputException extends JsonException {
    constructor(_context: JsonParserContext);
}

export declare class UnimplementedException extends BaseException {
    constructor();
}

export declare class UnknownException extends Error {
    constructor(message: string);
}

export declare class UnsupportedPlatformException extends BaseException {
    constructor();
}

export declare type WindowsPath = string & {
    __PRIVATE_DEVKIT_WINDOWS_PATH: void;
};
