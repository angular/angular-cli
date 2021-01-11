/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BuilderContext,
  BuilderHandlerFn,
  BuilderInfo,
  BuilderOutput,
  BuilderOutputLike,
  BuilderProgressReport,
  BuilderRun,
  ScheduleOptions,
  Target,
  fromAsyncIterable,
  isBuilderOutput,
} from '@angular-devkit/architect';
import { WorkspaceHost } from '@angular-devkit/architect/node';
import { TestProjectHost } from '@angular-devkit/architect/testing';
import { analytics, getSystemPath, join, json, logging, normalize } from '@angular-devkit/core';
import { Observable, Subject, from as observableFrom, of as observableOf } from 'rxjs';
import { catchError, finalize, first, map, mergeMap, shareReplay } from 'rxjs/operators';
import { BuilderWatcherFactory, WatcherNotifier } from './file-watching';

export interface BuilderHarnessExecutionResult<T extends BuilderOutput = BuilderOutput> {
  result?: T;
  error?: Error;
  logs: readonly logging.LogEntry[];
}

export interface BuilderHarnessExecutionOptions {
  configuration: string;
  outputLogsOnFailure: boolean;
  outputLogsOnException: boolean;
  useNativeFileWatching: boolean;
}

export class BuilderHarness<T> {
  private readonly builderInfo: BuilderInfo;
  private schemaRegistry = new json.schema.CoreSchemaRegistry();
  private projectName = 'test';
  private projectMetadata: Record<string, unknown> = { root: '.', sourceRoot: 'src' };
  private targetName?: string;
  private options = new Map<string | null, T>();
  private builderTargets = new Map<
    string,
    // tslint:disable-next-line: no-any
    { handler: BuilderHandlerFn<any>; info: BuilderInfo; options: json.JsonObject }
  >();
  private watcherNotifier?: WatcherNotifier;

  constructor(
    private readonly builderHandler: BuilderHandlerFn<T & json.JsonObject>,
    private readonly host: TestProjectHost,
    builderInfo?: Partial<BuilderInfo>,
  ) {
    // Generate default pseudo builder info for test purposes
    this.builderInfo = {
      builderName: builderHandler.name,
      description: '',
      optionSchema: true,
      ...builderInfo,
    };

    this.schemaRegistry.addPostTransform(json.schema.transforms.addUndefinedDefaults);
  }

  useProject(name: string, metadata: Record<string, unknown> = {}): this {
    if (!name) {
      throw new Error('Project name cannot be an empty string.');
    }

    this.projectName = name;
    this.projectMetadata = metadata;

    return this;
  }

  useTarget(name: string, baseOptions: T): this {
    if (!name) {
      throw new Error('Target name cannot be an empty string.');
    }

    this.targetName = name;
    this.options.set(null, baseOptions);

    return this;
  }

  withConfiguration(configuration: string, options: T): this {
    this.options.set(configuration, options);

    return this;
  }

  withBuilderTarget<O>(
    target: string,
    handler: BuilderHandlerFn<O & json.JsonObject>,
    options?: O,
    info?: Partial<BuilderInfo>,
  ): this {
    this.builderTargets.set(target, {
      handler,
      options: options || {},
      info: { builderName: handler.name, description: '', optionSchema: true, ...info },
    });

    return this;
  }

  execute(
    options: Partial<BuilderHarnessExecutionOptions> = {},
  ): Observable<BuilderHarnessExecutionResult> {
    const {
      configuration,
      outputLogsOnException = true,
      outputLogsOnFailure = true,
      useNativeFileWatching = false,
    } = options;

    const targetOptions = {
      ...this.options.get(null),
      ...((configuration && this.options.get(configuration)) ?? {}),
    };

    if (!useNativeFileWatching) {
      if (this.watcherNotifier) {
        throw new Error('Only one harness execution at a time is supported.');
      }
      this.watcherNotifier = new WatcherNotifier();
    }

    const contextHost: ContextHost = {
      findBuilderByTarget: async (project, target) => {
        this.validateProjectName(project);
        if (target === this.targetName) {
          return {
            info: this.builderInfo,
            handler: this.builderHandler as BuilderHandlerFn<json.JsonObject>,
          };
        }

        const builderTarget = this.builderTargets.get(target);
        if (builderTarget) {
          return { info: builderTarget.info, handler: builderTarget.handler };
        }

        throw new Error('Project target does not exist.');
      },
      async getBuilderName(project, target) {
        return (await this.findBuilderByTarget(project, target)).info.builderName;
      },
      getMetadata: async (project) => {
        this.validateProjectName(project);

        return this.projectMetadata as json.JsonObject;
      },
      getOptions: async (project, target, configuration) => {
        this.validateProjectName(project);
        if (target === this.targetName) {
          return this.options.get(configuration ?? null) ?? {};
        } else if (configuration !== undefined) {
          // Harness builder targets currently do not support configurations
          return {};
        } else {
          return (this.builderTargets.get(target)?.options as json.JsonObject) || {};
        }
      },
      hasTarget: async (project, target) => {
        this.validateProjectName(project);

        return this.targetName === target || this.builderTargets.has(target);
      },
      validate: async (options, builderName) => {
        let schema;
        if (builderName === this.builderInfo.builderName) {
          schema = this.builderInfo.optionSchema;
        } else {
          for (const [, value] of this.builderTargets) {
            if (value.info.builderName === builderName) {
              schema = value.info.optionSchema;
              break;
            }
          }
        }

        const validator = await this.schemaRegistry.compile(schema ?? true).toPromise();
        const { data } = await validator(options).toPromise();

        return data as json.JsonObject;
      },
    };
    const context = new HarnessBuilderContext(
      this.builderInfo,
      getSystemPath(this.host.root()),
      contextHost,
      useNativeFileWatching ? undefined : this.watcherNotifier,
    );
    if (this.targetName !== undefined) {
      context.target = {
        project: this.projectName,
        target: this.targetName,
        configuration: configuration as string,
      };
    }

    const logs: logging.LogEntry[] = [];
    context.logger.subscribe((e) => logs.push(e));

    return this.schemaRegistry.compile(this.builderInfo.optionSchema).pipe(
      mergeMap((validator) => validator(targetOptions)),
      map((validationResult) => validationResult.data),
      mergeMap((data) =>
        convertBuilderOutputToObservable(this.builderHandler(data as T & json.JsonObject, context)),
      ),
      map((buildResult) => ({ result: buildResult, error: undefined })),
      catchError((error) => {
        if (outputLogsOnException) {
          // tslint:disable-next-line: no-console
          console.error(logs.map((entry) => entry.message).join('\n'));
          // tslint:disable-next-line: no-console
          console.error(error);
        }

        return observableOf({ result: undefined, error });
      }),
      map(({ result, error }) => {
        if (outputLogsOnFailure && result?.success === false && logs.length > 0) {
          // tslint:disable-next-line: no-console
          console.error(logs.map((entry) => entry.message).join('\n'));
        }

        // Capture current logs and clear for next
        const currentLogs = logs.slice();
        logs.length = 0;

        return { result, error, logs: currentLogs };
      }),
      finalize(() => {
        this.watcherNotifier = undefined;

        for (const teardown of context.teardowns) {
          teardown();
        }
      }),
    );
  }

  async executeOnce(
    options?: Partial<BuilderHarnessExecutionOptions>,
  ): Promise<BuilderHarnessExecutionResult> {
    // Return the first result
    return this.execute(options).pipe(first()).toPromise();
  }

  async appendToFile(path: string, content: string): Promise<void> {
    await this.writeFile(path, this.readFile(path).concat(content));
  }

  async writeFile(path: string, content: string | Buffer): Promise<void> {
    this.host
      .scopedSync()
      .write(normalize(path), typeof content === 'string' ? Buffer.from(content) : content);

    this.watcherNotifier?.notify([
      { path: getSystemPath(join(this.host.root(), path)), type: 'modified' },
    ]);
  }

  async writeFiles(files: Record<string, string | Buffer>): Promise<void> {
    const watchEvents = this.watcherNotifier
      ? ([] as { path: string; type: 'modified' | 'deleted' }[])
      : undefined;

    for (const [path, content] of Object.entries(files)) {
      this.host
        .scopedSync()
        .write(normalize(path), typeof content === 'string' ? Buffer.from(content) : content);

      watchEvents?.push({ path: getSystemPath(join(this.host.root(), path)), type: 'modified' });
    }

    if (watchEvents) {
      this.watcherNotifier?.notify(watchEvents);
    }
  }

  async removeFile(path: string): Promise<void> {
    this.host.scopedSync().delete(normalize(path));

    this.watcherNotifier?.notify([
      { path: getSystemPath(join(this.host.root(), path)), type: 'deleted' },
    ]);
  }

  async modifyFile(
    path: string,
    modifier: (content: string) => string | Promise<string>,
  ): Promise<void> {
    const content = this.readFile(path);
    await this.writeFile(path, await modifier(content));

    this.watcherNotifier?.notify([
      { path: getSystemPath(join(this.host.root(), path)), type: 'modified' },
    ]);
  }

  hasFile(path: string): boolean {
    return this.host.scopedSync().exists(normalize(path));
  }

  readFile(path: string): string {
    const content = this.host.scopedSync().read(normalize(path));

    return Buffer.from(content).toString('utf8');
  }

  private validateProjectName(name: string): void {
    if (name !== this.projectName) {
      throw new Error(`Project "${name}" does not exist.`);
    }
  }
}

interface ContextHost extends WorkspaceHost {
  findBuilderByTarget(
    project: string,
    target: string,
  ): Promise<{ info: BuilderInfo; handler: BuilderHandlerFn<json.JsonObject> }>;
  validate(options: json.JsonObject, builderName: string): Promise<json.JsonObject>;
}

class HarnessBuilderContext implements BuilderContext {
  id = Math.trunc(Math.random() * 1000000);
  logger = new logging.Logger(`builder-harness-${this.id}`);
  workspaceRoot: string;
  currentDirectory: string;
  target?: Target;

  teardowns: (() => Promise<void> | void)[] = [];

  constructor(
    public builder: BuilderInfo,
    basePath: string,
    private readonly contextHost: ContextHost,
    public readonly watcherFactory: BuilderWatcherFactory | undefined,
  ) {
    this.workspaceRoot = this.currentDirectory = basePath;
  }

  get analytics(): analytics.Analytics {
    // Can be undefined even though interface does not allow it
    return (undefined as unknown) as analytics.Analytics;
  }

  addTeardown(teardown: () => Promise<void> | void): void {
    this.teardowns.push(teardown);
  }

  async getBuilderNameForTarget(target: Target): Promise<string> {
    return this.contextHost.getBuilderName(target.project, target.target);
  }

  async getProjectMetadata(targetOrName: Target | string): Promise<json.JsonObject> {
    const project = typeof targetOrName === 'string' ? targetOrName : targetOrName.project;

    return this.contextHost.getMetadata(project);
  }

  async getTargetOptions(target: Target): Promise<json.JsonObject> {
    return this.contextHost.getOptions(target.project, target.target, target.configuration);
  }

  // Unused by builders in this package
  async scheduleBuilder(
    builderName: string,
    options?: json.JsonObject,
    scheduleOptions?: ScheduleOptions,
  ): Promise<BuilderRun> {
    throw new Error('Not Implemented.');
  }

  async scheduleTarget(
    target: Target,
    overrides?: json.JsonObject,
    scheduleOptions?: ScheduleOptions,
  ): Promise<BuilderRun> {
    const { info, handler } = await this.contextHost.findBuilderByTarget(
      target.project,
      target.target,
    );
    const targetOptions = await this.validateOptions(
      {
        ...(await this.getTargetOptions(target)),
        ...overrides,
      },
      info.builderName,
    );

    const context = new HarnessBuilderContext(
      info,
      this.workspaceRoot,
      this.contextHost,
      this.watcherFactory,
    );
    context.target = target;
    context.logger = scheduleOptions?.logger || this.logger.createChild('');

    const progressSubject = new Subject<BuilderProgressReport>();
    const output = convertBuilderOutputToObservable(handler(targetOptions, context));

    const run: BuilderRun = {
      id: context.id,
      info,
      progress: progressSubject.asObservable(),
      async stop() {
        for (const teardown of context.teardowns) {
          await teardown();
        }
        progressSubject.complete();
      },
      output: output.pipe(shareReplay()),
      get result() {
        return this.output.pipe(first()).toPromise();
      },
    };

    return run;
  }

  async validateOptions<T extends json.JsonObject = json.JsonObject>(
    options: json.JsonObject,
    builderName: string,
  ): Promise<T> {
    return (this.contextHost.validate(options, builderName) as unknown) as T;
  }

  // Unused report methods
  reportRunning(): void {}
  reportStatus(): void {}
  reportProgress(): void {}
}

function isAsyncIterable<T>(obj: unknown): obj is AsyncIterable<T> {
  return !!obj && typeof (obj as AsyncIterable<T>)[Symbol.asyncIterator] === 'function';
}

function convertBuilderOutputToObservable(output: BuilderOutputLike): Observable<BuilderOutput> {
  if (isBuilderOutput(output)) {
    return observableOf(output);
  } else if (isAsyncIterable(output)) {
    return fromAsyncIterable(output);
  } else {
    return observableFrom(output);
  }
}
