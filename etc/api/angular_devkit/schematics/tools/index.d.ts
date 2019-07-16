export declare class CollectionCannotBeResolvedException extends BaseException {
    constructor(name: string);
}

export declare class CollectionMissingFieldsException extends BaseException {
    constructor(name: string);
}

export declare class CollectionMissingSchematicsMapException extends BaseException {
    constructor(name: string);
}

export declare type ContextTransform = (context: FileSystemSchematicContext) => FileSystemSchematicContext;

export declare class ExportStringRef<T> {
    readonly module: string;
    readonly path: string;
    readonly ref: T | undefined;
    constructor(ref: string, parentPath?: string, inner?: boolean);
}

export declare class FactoryCannotBeResolvedException extends BaseException {
    constructor(name: string);
}

export declare type FileSystemCollection = Collection<FileSystemCollectionDescription, FileSystemSchematicDescription>;

export declare type FileSystemCollectionDesc = CollectionDescription<FileSystemCollectionDescription>;

export interface FileSystemCollectionDescription {
    readonly name: string;
    readonly path: string;
    readonly schematics: {
        [name: string]: FileSystemSchematicDesc;
    };
    readonly version?: string;
}

export declare type FileSystemEngine = Engine<FileSystemCollectionDescription, FileSystemSchematicDescription>;

export declare class FileSystemEngineHost extends FileSystemEngineHostBase {
    protected _root: string;
    constructor(_root: string);
    protected _resolveCollectionPath(name: string): string;
    protected _resolveReferenceString(refString: string, parentPath: string): {
        ref: RuleFactory<{}>;
        path: string;
    } | null;
    protected _transformCollectionDescription(name: string, desc: Partial<FileSystemCollectionDesc>): FileSystemCollectionDesc;
    protected _transformSchematicDescription(name: string, _collection: FileSystemCollectionDesc, desc: Partial<FileSystemSchematicDesc>): FileSystemSchematicDesc;
    createTaskExecutor(name: string): Observable<TaskExecutor>;
    hasTaskExecutor(name: string): boolean;
}

export declare abstract class FileSystemEngineHostBase implements FileSystemEngineHost {
    protected abstract _resolveCollectionPath(name: string): string;
    protected abstract _resolveReferenceString(name: string, parentPath: string): {
        ref: RuleFactory<{}>;
        path: string;
    } | null;
    protected abstract _transformCollectionDescription(name: string, desc: Partial<FileSystemCollectionDesc>): FileSystemCollectionDesc;
    protected abstract _transformSchematicDescription(name: string, collection: FileSystemCollectionDesc, desc: Partial<FileSystemSchematicDesc>): FileSystemSchematicDesc;
    createCollectionDescription(name: string): FileSystemCollectionDesc;
    createSchematicDescription(name: string, collection: FileSystemCollectionDesc): FileSystemSchematicDesc | null;
    createSourceFromUrl(url: Url): Source | null;
    createTaskExecutor(name: string): Observable<TaskExecutor>;
    getSchematicRuleFactory<OptionT extends object>(schematic: FileSystemSchematicDesc, _collection: FileSystemCollectionDesc): RuleFactory<OptionT>;
    hasTaskExecutor(name: string): boolean;
    listSchematicNames(collection: FileSystemCollectionDesc): string[];
    listSchematics(collection: FileSystemCollection): string[];
    registerContextTransform(t: ContextTransform): void;
    registerOptionsTransform<T extends object, R extends object>(t: OptionTransform<T, R>): void;
    registerTaskExecutor<T>(factory: TaskExecutorFactory<T>, options?: T): void;
    transformContext(context: FileSystemSchematicContext): FileSystemSchematicContext;
    transformOptions<OptionT extends object, ResultT extends object>(schematic: FileSystemSchematicDesc, options: OptionT, context?: FileSystemSchematicContext): Observable<ResultT>;
}

export declare class FileSystemHost extends virtualFs.ScopedHost<{}> {
    constructor(dir: string);
}

export declare type FileSystemSchematic = Schematic<FileSystemCollectionDescription, FileSystemSchematicDescription>;

export declare type FileSystemSchematicContext = TypedSchematicContext<FileSystemCollectionDescription, FileSystemSchematicDescription>;

export declare type FileSystemSchematicDesc = SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;

export interface FileSystemSchematicDescription extends FileSystemSchematicJsonDescription {
    readonly factoryFn: RuleFactory<{}>;
    readonly path: string;
    readonly schemaJson?: JsonObject;
}

export interface FileSystemSchematicJsonDescription {
    readonly aliases?: string[];
    readonly collection: FileSystemCollectionDescription;
    readonly description: string;
    readonly extends?: string;
    readonly factory: string;
    readonly name: string;
    readonly schema?: string;
}

export declare class InvalidCollectionJsonException extends BaseException {
    constructor(_name: string, path: string, jsonException?: UnexpectedEndOfInputException | InvalidJsonCharacterException);
}

export declare class NodeModulesEngineHost extends FileSystemEngineHostBase {
    constructor();
    protected _resolveCollectionPath(name: string): string;
    protected _resolvePackageJson(name: string, basedir?: string): string;
    protected _resolvePath(name: string, basedir?: string): string;
    protected _resolveReferenceString(refString: string, parentPath: string): {
        ref: RuleFactory<{}>;
        path: string;
    } | null;
    protected _transformCollectionDescription(name: string, desc: Partial<FileSystemCollectionDesc>): FileSystemCollectionDesc;
    protected _transformSchematicDescription(name: string, _collection: FileSystemCollectionDesc, desc: Partial<FileSystemSchematicDesc>): FileSystemSchematicDesc;
}

export declare class NodeModulesTestEngineHost extends NodeModulesEngineHost {
    readonly tasks: TaskConfiguration<{}>[];
    protected _resolveCollectionPath(name: string): string;
    clearTasks(): void;
    registerCollection(name: string, path: string): void;
    transformContext(context: FileSystemSchematicContext): FileSystemSchematicContext;
}

export declare class NodePackageDoesNotSupportSchematics extends BaseException {
    constructor(name: string);
}

export declare class NodeWorkflow extends workflow.BaseWorkflow {
    readonly engine: FileSystemEngine;
    readonly engineHost: NodeModulesEngineHost;
    constructor(host: virtualFs.Host, options: {
        force?: boolean;
        dryRun?: boolean;
        root?: Path;
        packageManager?: string;
        registry?: schema.CoreSchemaRegistry;
    });
}

export declare type OptionTransform<T extends object, R extends object> = (schematic: FileSystemSchematicDescription, options: T, context?: FileSystemSchematicContext) => Observable<R> | PromiseLike<R> | R;

export declare class SchematicMissingDescriptionException extends BaseException {
    constructor(name: string);
}

export declare class SchematicMissingFactoryException extends BaseException {
    constructor(name: string);
}

export declare class SchematicMissingFieldsException extends BaseException {
    constructor(name: string);
}

export declare class SchematicNameCollisionException extends BaseException {
    constructor(name: string);
}

export declare function validateOptionsWithSchema(registry: schema.SchemaRegistry): <T extends {}>(schematic: FileSystemSchematicDescription, options: T, context?: import("@angular-devkit/schematics").TypedSchematicContext<import("@angular-devkit/schematics/tools/tools/description").FileSystemCollectionDescription, FileSystemSchematicDescription> | undefined) => Observable<T>;
