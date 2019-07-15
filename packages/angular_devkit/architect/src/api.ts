/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics, experimental, json, logging } from '@angular-devkit/core';
import { Observable, SubscribableOrPromise, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Schema as RealBuilderInput, Target as RealTarget } from './input-schema';
import { Schema as RealBuilderOutput } from './output-schema';
import { Schema as RealBuilderProgress, State as BuilderProgressState } from './progress-schema';

export type Target = json.JsonObject & RealTarget;
export {
  BuilderProgressState,
};

// Type short hands.
export type BuilderRegistry =
  experimental.jobs.Registry<json.JsonObject, BuilderInput, BuilderOutput>;


/**
 * An API typed BuilderProgress. The interface generated from the schema is too permissive,
 * so this API is the one we show in our API. Please note that not all fields are in there; this
 * is in addition to fields in the schema.
 */
export type TypedBuilderProgress = (
    { state: BuilderProgressState.Stopped; }
  | { state: BuilderProgressState.Error; error: json.JsonValue; }
  | { state: BuilderProgressState.Waiting; status?: string; }
  | { state: BuilderProgressState.Running; status?: string; current: number; total?: number; }
);

/**
 * Declaration of those types as JsonObject compatible. JsonObject is not compatible with
 * optional members, so those wouldn't be directly assignable to our internal Json typings.
 * Forcing the type to be both a JsonObject and the type from the Schema tells Typescript they
 * are compatible (which they are).
 * These types should be used everywhere.
 */
export type BuilderInput = json.JsonObject & RealBuilderInput;
export type BuilderOutput = json.JsonObject & RealBuilderOutput;
export type BuilderProgress = json.JsonObject & RealBuilderProgress & TypedBuilderProgress;

/**
 * A progress report is what the tooling will receive. It contains the builder info and the target.
 * Although these are serializable, they are only exposed through the tooling interface, not the
 * builder interface. The watch dog sends BuilderProgress and the Builder has a set of functions
 * to manage the state.
 */
export type BuilderProgressReport = BuilderProgress & ({
  target?: Target;
  builder: BuilderInfo;
});

/**
 * A Run, which is what is returned by scheduleBuilder or scheduleTarget functions. This should
 * be reconstructed across memory boundaries (it's not serializable but all internal information
 * are).
 */
export interface BuilderRun {
  /**
   * Unique amongst runs. This is the same ID as the context generated for the run. It can be
   * used to identify multiple unique runs. There is no guarantee that a run is a single output;
   * a builder can rebuild on its own and will generate multiple outputs.
   */
  id: number;

  /**
   * The builder information.
   */
  info: BuilderInfo;

  /**
   * The next output from a builder. This is recommended when scheduling a builder and only being
   * interested in the result of that single run, not of a watch-mode builder.
   */
  result: Promise<BuilderOutput>;

  /**
   * The output(s) from the builder. A builder can have multiple outputs.
   * This always replay the last output when subscribed.
   */
  output: Observable<BuilderOutput>;

  /**
   * The progress report. A progress also contains an ID, which can be different than this run's
   * ID (if the builder calls scheduleBuilder or scheduleTarget).
   * This will always replay the last progress on new subscriptions.
   */
  progress: Observable<BuilderProgressReport>;

  /**
   * Stop the builder from running. Returns a promise that resolves when the builder is stopped.
   * Some builders might not handle stopping properly and should have a timeout here.
   */
  stop(): Promise<void>;
}

/**
 * Additional optional scheduling options.
 */
export interface ScheduleOptions {
  /**
   * Logger to pass to the builder. Note that messages will stop being forwarded, and if you want
   * to log a builder scheduled from your builder you should forward log events yourself.
   */
  logger?: logging.Logger;

  /**
   * Target to pass to the builder.
   */
  target?: Target;
}

/**
 * The context received as a second argument in your builder.
 */
export interface BuilderContext {
  /**
   * Unique amongst contexts. Contexts instances are not guaranteed to be the same (but it could
   * be the same context), and all the fields in a context could be the same, yet the builder's
   * context could be different. This is the same ID as the corresponding run.
   */
  id: number;

  /**
   * The builder info that called your function. Since the builder info is from the builder.json
   * (or the host), it could contain information that is different than expected.
   */
  builder: BuilderInfo;

  /**
   * A logger that appends messages to a log. This could be a separate interface or completely
   * ignored. `console.log` could also be completely ignored.
   */
  logger: logging.LoggerApi;

  /**
   * The absolute workspace root of this run. This is a system path and will not be normalized;
   * ie. on Windows it will starts with `C:\\` (or whatever drive).
   */
  workspaceRoot: string;

  /**
   * The current directory the user is in. This could be outside the workspace root. This is a
   * system path and will not be normalized; ie. on Windows it will starts with `C:\\` (or
   * whatever drive).
   */
  currentDirectory: string;

  /**
   * The target that was used to run this builder.
   * Target is optional if a builder was ran using `scheduleBuilder()`.
   */
  target?: Target;

  /**
   * Schedule a target in the same workspace. This can be the same target that is being executed
   * right now, but targets of the same name are serialized.
   * Running the same target and waiting for it to end will result in a deadlocking scenario.
   * Targets are considered the same if the project, the target AND the configuration are the same.
   * @param target The target to schedule.
   * @param overrides A set of options to override the workspace set of options.
   * @param scheduleOptions Additional optional scheduling options.
   * @return A promise of a run. It will resolve when all the members of the run are available.
   */
  scheduleTarget(
    target: Target,
    overrides?: json.JsonObject,
    scheduleOptions?: ScheduleOptions,
  ): Promise<BuilderRun>;

  /**
   * Schedule a builder by its name. This can be the same builder that is being executed.
   * @param builderName The name of the builder, ie. its `packageName:builderName` tuple.
   * @param options All options to use for the builder (by default empty object). There is no
   *     additional options added, e.g. from the workspace.
   * @param scheduleOptions Additional optional scheduling options.
   * @return A promise of a run. It will resolve when all the members of the run are available.
   */
  scheduleBuilder(
    builderName: string,
    options?: json.JsonObject,
    scheduleOptions?: ScheduleOptions,
  ): Promise<BuilderRun>;

  /**
   * Resolve and return options for a specified target. If the target isn't defined in the
   * workspace this will reject the promise. This object will be read directly from the workspace
   * but not validated against the builder of the target.
   * @param target The target to resolve the options of.
   * @return A non-validated object resolved from the workspace.
   */
  getTargetOptions(target: Target): Promise<json.JsonObject>;

  /**
   * Resolves and return a builder name. The exact format of the name is up to the host,
   * so it should not be parsed to gather information (it's free form). This string can be
   * used to validate options or schedule a builder directly.
   * @param target The target to resolve the builder name.
   */
  getBuilderNameForTarget(target: Target): Promise<string>;

  /**
   * Validates the options against a builder schema. This uses the same methods as the
   * scheduleTarget and scheduleBrowser methods to validate and apply defaults to the options.
   * It can be generically typed, if you know which interface it is supposed to validate against.
   * @param options A generic option object to validate.
   * @param builderName The name of a builder to use. This can be gotten for a target by using the
   *                    getBuilderForTarget() method on the context.
   */
  validateOptions<T extends json.JsonObject = json.JsonObject>(
    options: json.JsonObject,
    builderName: string,
  ): Promise<T>;

  /**
   * Set the builder to running. This should be used if an external event triggered a re-run,
   * e.g. a file watched was changed.
   */
  reportRunning(): void;

  /**
   * Update the status string shown on the interface.
   * @param status The status to set it to. An empty string can be used to remove the status.
   */
  reportStatus(status: string): void;

  /**
   * Update the progress for this builder run.
   * @param current The current progress. This will be between 0 and total.
   * @param total A new total to set. By default at the start of a run this is 1. If omitted it
   *     will use the same value as the last total.
   * @param status Update the status string. If omitted the status string is not modified.
   */
  reportProgress(current: number, total?: number, status?: string): void;

  /**
   * API to report analytics. This might be undefined if the feature is unsupported. This might
   * not be undefined, but the backend could also not report anything.
   */
  readonly analytics: analytics.Analytics;

  /**
   * Add teardown logic to this Context, so that when it's being stopped it will execute teardown.
   */
  addTeardown(teardown: () => (Promise<void> | void)): void;
}


/**
 * An accepted return value from a builder. Can be either an Observable, a Promise or a vector.
 */
export type BuilderOutputLike = SubscribableOrPromise<BuilderOutput> | BuilderOutput;

// tslint:disable-next-line:no-any
export function isBuilderOutput(obj: any): obj is BuilderOutput {
  if (!obj || typeof obj.then === 'function' || typeof obj.subscribe === 'function') {
    return false;
  }

  return typeof obj.success === 'boolean';
}

/**
 * A builder handler function. The function signature passed to `createBuilder()`.
 */
export interface BuilderHandlerFn<A extends json.JsonObject> {
  /**
   * Builders are defined by users to perform any kind of task, like building, testing or linting,
   * and should use this interface.
   * @param input The options (a JsonObject), validated by the schema and received by the
   *     builder. This can include resolved options from the CLI or the workspace.
   * @param context A context that can be used to interact with the Architect framework.
   * @return One or many builder output.
   */
  (input: A, context: BuilderContext): BuilderOutputLike;
}

/**
 * A Builder general information. This is generated by the host and is expanded by the host, but
 * the public API contains those fields.
 */
export type BuilderInfo = json.JsonObject & {
  builderName: string;
  description: string;
  optionSchema: json.schema.JsonSchema;
};


/**
 * Returns a string of "project:target[:configuration]" for the target object.
 */
export function targetStringFromTarget({project, target, configuration}: Target) {
  return `${project}:${target}${configuration !== undefined ? ':' + configuration : ''}`;
}

/**
 * Return a Target tuple from a string.
 */
export function targetFromTargetString(str: string): Target {
  const tuple = str.split(/:/, 3);
  if (tuple.length < 2) {
    throw new Error('Invalid target string: ' + JSON.stringify(str));
  }

  return {
    project: tuple[0],
    target: tuple[1],
    ...(tuple[2] !== undefined) && { configuration: tuple[2] },
  };
}

/**
 * Schedule a target, and forget about its run. This will return an observable of outputs, that
 * as a a teardown will stop the target from running. This means that the Run object this returns
 * should not be shared.
 *
 * The reason this is not part of the Context interface is to keep the Context as normal form as
 * possible. This is really an utility that people would implement in their project.
 *
 * @param context The context of your current execution.
 * @param target The target to schedule.
 * @param overrides Overrides that are used in the target.
 * @param scheduleOptions Additional scheduling options.
 */
export function scheduleTargetAndForget(
  context: BuilderContext,
  target: Target,
  overrides?: json.JsonObject,
  scheduleOptions?: ScheduleOptions,
): Observable<BuilderOutput> {
  let resolve: (() => void) | null = null;
  const promise = new Promise<void>(r => resolve = r);
  context.addTeardown(() => promise);

  return from(context.scheduleTarget(target, overrides, scheduleOptions)).pipe(
    switchMap(run => new Observable<BuilderOutput>(observer => {
      const subscription = run.output.subscribe(observer);

      return () => {
        subscription.unsubscribe();
        // We can properly ignore the floating promise as it's a "reverse" promise; the teardown
        // is waiting for the resolve.
        // tslint:disable-next-line:no-floating-promises
        run.stop().then(resolve);
      };
    })),
  );
}
