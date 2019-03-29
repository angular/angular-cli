export declare class Architect {
    constructor(_host: ArchitectHost, _registry?: json.schema.SchemaRegistry, additionalJobRegistry?: experimental.jobs.Registry);
    has(name: experimental.jobs.JobName): Observable<boolean>;
    scheduleBuilder(name: string, options: json.JsonObject, scheduleOptions?: ScheduleOptions): Promise<BuilderRun>;
    scheduleTarget(target: Target, overrides?: json.JsonObject, scheduleOptions?: ScheduleOptions): Promise<BuilderRun>;
}

export declare function createBuilder<OptT extends json.JsonObject, OutT extends BuilderOutput = BuilderOutput>(fn: BuilderHandlerFn<OptT>): Builder<OptT>;

export interface ScheduleOptions {
    analytics?: analytics.Analytics;
    logger?: logging.Logger;
}
