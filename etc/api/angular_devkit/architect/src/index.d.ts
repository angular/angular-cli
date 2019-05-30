export declare class Architect {
    constructor(_host: ArchitectHost, registry?: json.schema.SchemaRegistry, additionalJobRegistry?: experimental.jobs.Registry);
    has(name: experimental.jobs.JobName): Observable<boolean>;
    scheduleBuilder(name: string, options: json.JsonObject, scheduleOptions?: ScheduleOptions): Promise<BuilderRun>;
    scheduleTarget(target: Target, overrides?: json.JsonObject, scheduleOptions?: ScheduleOptions): Promise<BuilderRun>;
}

export interface BuilderContext {
    readonly analytics: analytics.Analytics;
    builder: BuilderInfo;
    currentDirectory: string;
    id: number;
    logger: logging.LoggerApi;
    target?: Target;
    workspaceRoot: string;
    addTeardown(teardown: () => (Promise<void> | void)): void;
    getBuilderNameForTarget(target: Target): Promise<string>;
    getTargetOptions(target: Target): Promise<json.JsonObject>;
    reportProgress(current: number, total?: number, status?: string): void;
    reportRunning(): void;
    reportStatus(status: string): void;
    scheduleBuilder(builderName: string, options?: json.JsonObject, scheduleOptions?: ScheduleOptions): Promise<BuilderRun>;
    scheduleTarget(target: Target, overrides?: json.JsonObject, scheduleOptions?: ScheduleOptions): Promise<BuilderRun>;
    validateOptions<T extends json.JsonObject = json.JsonObject>(options: json.JsonObject, builderName: string): Promise<T>;
}

export interface BuilderHandlerFn<A extends json.JsonObject> {
    (input: A, context: BuilderContext): BuilderOutputLike;
}

export declare type BuilderInfo = json.JsonObject & {
    builderName: string;
    description: string;
    optionSchema: json.schema.JsonSchema;
};

export declare type BuilderInput = json.JsonObject & RealBuilderInput;

export declare type BuilderOutput = json.JsonObject & RealBuilderOutput;

export declare type BuilderOutputLike = SubscribableOrPromise<BuilderOutput> | BuilderOutput;

export declare type BuilderProgress = json.JsonObject & RealBuilderProgress & TypedBuilderProgress;

export declare type BuilderProgressReport = BuilderProgress & ({
    target?: Target;
    builder: BuilderInfo;
});

export declare type BuilderRegistry = experimental.jobs.Registry<json.JsonObject, BuilderInput, BuilderOutput>;

export interface BuilderRun {
    id: number;
    info: BuilderInfo;
    output: Observable<BuilderOutput>;
    progress: Observable<BuilderProgressReport>;
    result: Promise<BuilderOutput>;
    stop(): Promise<void>;
}

export declare function createBuilder<OptT extends json.JsonObject, OutT extends BuilderOutput = BuilderOutput>(fn: BuilderHandlerFn<OptT>): Builder<OptT>;

export declare function isBuilderOutput(obj: any): obj is BuilderOutput;

export interface ScheduleOptions {
    analytics?: analytics.Analytics;
    logger?: logging.Logger;
}

export declare function scheduleTargetAndForget(context: BuilderContext, target: Target, overrides?: json.JsonObject, scheduleOptions?: ScheduleOptions): Observable<BuilderOutput>;

export declare type Target = json.JsonObject & RealTarget;

export declare function targetFromTargetString(str: string): Target;

export declare function targetStringFromTarget({ project, target, configuration }: Target): string;

export declare type TypedBuilderProgress = ({
    state: BuilderProgressState.Stopped;
} | {
    state: BuilderProgressState.Error;
    error: json.JsonValue;
} | {
    state: BuilderProgressState.Waiting;
    status?: string;
} | {
    state: BuilderProgressState.Running;
    status?: string;
    current: number;
    total?: number;
});
