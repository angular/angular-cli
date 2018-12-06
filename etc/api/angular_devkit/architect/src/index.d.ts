export declare class Architect {
    constructor(_workspace: experimental.workspace.Workspace);
    getBuilder<OptionsT>(builderDescription: BuilderDescription, context: BuilderContext): Builder<OptionsT>;
    getBuilderConfiguration<OptionsT>(targetSpec: TargetSpecifier): BuilderConfiguration<OptionsT>;
    getBuilderDescription<OptionsT>(builderConfig: BuilderConfiguration<OptionsT>): Observable<BuilderDescription>;
    listProjectTargets(projectName: string): string[];
    loadArchitect(): Observable<this>;
    run<OptionsT>(builderConfig: BuilderConfiguration<OptionsT>, partialContext?: Partial<BuilderContext>): Observable<BuildEvent>;
    validateBuilderOptions<OptionsT>(builderConfig: BuilderConfiguration<OptionsT>, builderDescription: BuilderDescription): Observable<BuilderConfiguration<OptionsT>>;
}

export declare class ArchitectNotYetLoadedException extends BaseException {
    constructor();
}

export interface Builder<OptionsT> {
    run(builderConfig: BuilderConfiguration<Partial<OptionsT>>): Observable<BuildEvent>;
}

export declare class BuilderCannotBeResolvedException extends BaseException {
    constructor(builder: string);
}

export interface BuilderConfiguration<OptionsT = {}> {
    builder: string;
    options: OptionsT;
    projectType: string;
    root: Path;
    sourceRoot?: Path;
}

export interface BuilderConstructor<OptionsT> {
    new (context: BuilderContext): Builder<OptionsT>;
}

export interface BuilderContext {
    architect: Architect;
    host: virtualFs.Host<{}>;
    logger: logging.Logger;
    targetSpecifier?: TargetSpecifier;
    workspace: experimental.workspace.Workspace;
}

export interface BuilderDescription {
    description: string;
    name: string;
    schema: JsonObject;
}

export declare class BuilderNotFoundException extends BaseException {
    constructor(builder: string);
}

export interface BuilderPaths {
    class: Path;
    description: string;
    schema: Path;
}

export interface BuilderPathsMap {
    builders: {
        [k: string]: BuilderPaths;
    };
}

export interface BuildEvent {
    success: boolean;
}

export declare class ConfigurationNotFoundException extends BaseException {
    constructor(projectName: string, configurationName: string);
}

export declare class ProjectNotFoundException extends BaseException {
    constructor(projectName: string);
}

export interface Target<T = JsonObject> {
    builder: string;
    configurations?: {
        [k: string]: TargetConfiguration<T>;
    };
    options: TargetOptions<T>;
}

export declare type TargetConfiguration<T = JsonObject> = Partial<T>;

export interface TargetMap {
    [k: string]: Target;
}

export declare class TargetNotFoundException extends BaseException {
    constructor(projectName: string, targetName: string);
}

export declare type TargetOptions<T = JsonObject> = T;

export interface TargetSpecifier<OptionsT = {}> {
    configuration?: string;
    overrides?: Partial<OptionsT>;
    project: string;
    target: string;
}
