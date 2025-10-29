/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-extraneous-dependencies */

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
import { getSystemPath, json, logging } from '@angular-devkit/core';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  Observable,
  Subject,
  catchError,
  finalize,
  firstValueFrom,
  lastValueFrom,
  map,
  mergeMap,
  from as observableFrom,
  of as observableOf,
  shareReplay,
} from 'rxjs';
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
  signal: AbortSignal;
  additionalExecuteArguments: unknown[];
}

interface BuilderHandlerFnWithVarArgs<T> extends BuilderHandlerFn<T> {
  (input: T, context: BuilderContext, ...args: unknown[]): BuilderOutputLike;
}

/**
 * The default set of fields provided to all builders executed via the BuilderHarness.
 * `root` and `sourceRoot` are required for most Angular builders to function.
 * `cli.cache.enabled` set to false provides improved test isolation guarantees by disabling
 * the Webpack caching.
 */
const DEFAULT_PROJECT_METADATA = {
  root: '.',
  sourceRoot: 'src',
  cli: {
    cache: {
      enabled: false,
    },
  },
};

export class BuilderHarness<T> {
  private readonly builderInfo: BuilderInfo;
  private schemaRegistry = new json.schema.CoreSchemaRegistry();
  private projectName = 'test';
  private projectMetadata: Record<string, unknown> = DEFAULT_PROJECT_METADATA;
  private targetName?: string;
  private options = new Map<string | null, T>();
  private builderTargets = new Map<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    if (builderInfo?.builderName?.startsWith('@angular/build:')) {
      this.schemaRegistry.addPostTransform(json.schema.transforms.addUndefinedObjectDefaults);
    } else {
      this.schemaRegistry.addPostTransform(json.schema.transforms.addUndefinedDefaults);
    }
  }

  private resolvePath(path: string): string {
    return join(getSystemPath(this.host.root()), path);
  }

  resetProjectMetadata(): void {
    this.projectMetadata = DEFAULT_PROJECT_METADATA;
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

  withBuilderTarget<O extends object>(
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modifyTarget<O extends object = any>(
    targetName: string,
    modifier: (options: O) => O | void,
  ): this {
    const target = this.builderTargets.get(targetName);
    if (!target) {
      throw new Error(`Target "${targetName}" not found.`);
    }

    const newOptions = modifier(target.options as O);
    if (newOptions) {
      target.options = newOptions as json.JsonObject;
    }

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
          return (this.options.get(configuration ?? null) ?? {}) as json.JsonObject;
        } else if (configuration !== undefined) {
          // Harness builder targets currently do not support configurations
          return {};
        } else {
          return this.builderTargets.get(target)?.options || {};
        }
      },
      hasTarget: async (project, target) => {
        this.validateProjectName(project);

        return this.targetName === target || this.builderTargets.has(target);
      },
      getDefaultConfigurationName: async (_project, _target) => {
        return undefined;
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

        const validator = await this.schemaRegistry.compile(schema ?? true);
        const { data } = await validator(options);

        return data as json.JsonObject;
      },
    };
    const context = new HarnessBuilderContext(
      this.builderInfo,
      this.resolvePath('.'),
      contextHost,
      options.signal,
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
    const logger$ = context.logger.subscribe((e) => logs.push(e));

    return observableFrom(this.schemaRegistry.compile(this.builderInfo.optionSchema)).pipe(
      mergeMap((validator) => validator(targetOptions)),
      map((validationResult) => validationResult.data),
      mergeMap((data) =>
        convertBuilderOutputToObservable(
          (this.builderHandler as BuilderHandlerFnWithVarArgs<T>)(
            data as T & json.JsonObject,
            context,
            ...(options.additionalExecuteArguments ?? []),
          ),
        ),
      ),
      map((buildResult) => ({ result: buildResult, error: undefined })),
      catchError((error) => {
        if (outputLogsOnException) {
          // eslint-disable-next-line no-console
          console.error(logs.map((entry) => entry.message).join('\n'));
          // eslint-disable-next-line no-console
          console.error(error);
        }

        return observableOf({ result: undefined, error });
      }),
      map(({ result, error }) => {
        if (outputLogsOnFailure && result?.success === false && logs.length > 0) {
          // eslint-disable-next-line no-console
          console.error(logs.map((entry) => entry.message).join('\n'));
        }

        // Capture current logs and clear for next
        const currentLogs = logs.slice();
        logs.length = 0;

        return { result, error, logs: currentLogs };
      }),
      finalize(() => {
        this.watcherNotifier = undefined;
        logger$.unsubscribe();

        for (const teardown of context.teardowns) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          teardown();
        }
      }),
    );
  }

  async executeOnce(
    options?: Partial<BuilderHarnessExecutionOptions>,
  ): Promise<BuilderHarnessExecutionResult> {
    // Return the first result
    return firstValueFrom(this.execute(options));
  }

  async appendToFile(path: string, content: string): Promise<void> {
    await this.writeFile(path, this.readFile(path).concat(content));
  }

  async writeFile(path: string, content: string | Buffer): Promise<void> {
    const fullPath = this.resolvePath(path);

    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');

    this.watcherNotifier?.notify([{ path: fullPath, type: 'modified' }]);
  }

  async writeFiles(files: Record<string, string | Buffer>): Promise<void> {
    const watchEvents = this.watcherNotifier
      ? ([] as { path: string; type: 'modified' | 'deleted' }[])
      : undefined;

    for (const [path, content] of Object.entries(files)) {
      const fullPath = this.resolvePath(path);

      await fs.mkdir(dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      watchEvents?.push({ path: fullPath, type: 'modified' });
    }

    if (watchEvents) {
      this.watcherNotifier?.notify(watchEvents);
    }
  }

  async removeFile(path: string): Promise<void> {
    const fullPath = this.resolvePath(path);

    await fs.unlink(fullPath);

    this.watcherNotifier?.notify([{ path: fullPath, type: 'deleted' }]);
  }

  async modifyFile(
    path: string,
    modifier: (content: string) => string | Promise<string>,
  ): Promise<void> {
    const content = this.readFile(path);
    await this.writeFile(path, await modifier(content));
  }

  hasFile(path: string): boolean {
    const fullPath = this.resolvePath(path);

    return existsSync(fullPath);
  }

  hasDirectory(path: string): boolean {
    const fullPath = this.resolvePath(path);

    return statSync(fullPath, { throwIfNoEntry: false })?.isDirectory() ?? false;
  }

  hasFileMatch(directory: string, pattern: RegExp): boolean {
    const fullPath = this.resolvePath(directory);

    return readdirSync(fullPath).some((name) => pattern.test(name));
  }

  readFile(path: string): string {
    const fullPath = this.resolvePath(path);

    return readFileSync(fullPath, 'utf-8');
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
    public readonly signal: AbortSignal | undefined,
    public readonly watcherFactory: BuilderWatcherFactory | undefined,
  ) {
    this.workspaceRoot = this.currentDirectory = basePath;
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
      this.signal,
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
        return firstValueFrom(this.output);
      },
      get lastOutput() {
        return lastValueFrom(this.output);
      },
    };

    return run;
  }

  async validateOptions<T extends json.JsonObject = json.JsonObject>(
    options: json.JsonObject,
    builderName: string,
  ): Promise<T> {
    return this.contextHost.validate(options, builderName) as unknown as T;
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
