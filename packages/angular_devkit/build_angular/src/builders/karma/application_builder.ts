/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuildOutputFileType } from '@angular/build';
import {
  ApplicationBuilderInternalOptions,
  Result,
  ResultFile,
  ResultKind,
  buildApplicationInternal,
  emitFilesToDisk,
} from '@angular/build/private';
import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { randomUUID } from 'crypto';
import glob from 'fast-glob';
import * as fs from 'fs/promises';
import type { Config, ConfigOptions, InlinePluginDef } from 'karma';
import * as path from 'path';
import { Observable, Subscriber, catchError, defaultIfEmpty, from, of, switchMap } from 'rxjs';
import { Configuration } from 'webpack';
import { ExecutionTransformer } from '../../transforms';
import { OutputHashing } from '../browser-esbuild/schema';
import { findTests } from './find-tests';
import { Schema as KarmaBuilderOptions } from './schema';

interface BuildOptions extends ApplicationBuilderInternalOptions {
  // We know that it's always a string since we set it.
  outputPath: string;
}

class ApplicationBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationBuildError';
  }
}

function injectKarmaReporter(
  context: BuilderContext,
  buildOptions: BuildOptions,
  buildIterator: AsyncIterator<Result>,
  karmaConfig: Config & ConfigOptions,
  subscriber: Subscriber<BuilderOutput>,
) {
  const reporterName = 'angular-progress-notifier';

  interface RunCompleteInfo {
    exitCode: number;
  }

  interface KarmaEmitter {
    refreshFiles(): void;
  }

  class ProgressNotifierReporter {
    static $inject = ['emitter'];

    constructor(private readonly emitter: KarmaEmitter) {
      this.startWatchingBuild();
    }

    private startWatchingBuild() {
      void (async () => {
        // This is effectively "for await of but skip what's already consumed".
        let isDone = false; // to mark the loop condition as "not constant".
        while (!isDone) {
          const { done, value: buildOutput } = await buildIterator.next();
          if (done) {
            isDone = true;
            break;
          }

          if (buildOutput.kind === ResultKind.Failure) {
            subscriber.next({ success: false, message: 'Build failed' });
          } else if (
            buildOutput.kind === ResultKind.Incremental ||
            buildOutput.kind === ResultKind.Full
          ) {
            await writeTestFiles(buildOutput.files, buildOptions.outputPath);
            this.emitter.refreshFiles();
          }
        }
      })();
    }

    onRunComplete = function (_browsers: unknown, results: RunCompleteInfo) {
      if (results.exitCode === 0) {
        subscriber.next({ success: true });
      } else {
        subscriber.next({ success: false });
      }
    };
  }

  karmaConfig.reporters ??= [];
  karmaConfig.reporters.push(reporterName);

  karmaConfig.plugins ??= [];
  karmaConfig.plugins.push({
    [`reporter:${reporterName}`]: [
      'factory',
      Object.assign(
        (...args: ConstructorParameters<typeof ProgressNotifierReporter>) =>
          new ProgressNotifierReporter(...args),
        ProgressNotifierReporter,
      ),
    ],
  });
}

export function execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  karmaOptions: ConfigOptions,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<Configuration>;
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: ConfigOptions) => ConfigOptions;
  } = {},
): Observable<BuilderOutput> {
  return from(initializeApplication(options, context, karmaOptions, transforms)).pipe(
    switchMap(
      ([karma, karmaConfig, buildOptions, buildIterator]) =>
        new Observable<BuilderOutput>((subscriber) => {
          // If `--watch` is explicitly enabled or if we are keeping the Karma
          // process running, we should hook Karma into the build.
          if (buildIterator) {
            injectKarmaReporter(context, buildOptions, buildIterator, karmaConfig, subscriber);
          }

          // Complete the observable once the Karma server returns.
          const karmaServer = new karma.Server(karmaConfig as Config, (exitCode) => {
            subscriber.next({ success: exitCode === 0 });
            subscriber.complete();
          });

          const karmaStart = karmaServer.start();

          // Cleanup, signal Karma to exit.
          return () => {
            void karmaStart.then(() => karmaServer.stop());
          };
        }),
    ),
    catchError((err) => {
      if (err instanceof ApplicationBuildError) {
        return of({ success: false, message: err.message });
      }

      throw err;
    }),
    defaultIfEmpty({ success: false }),
  );
}

async function getProjectSourceRoot(context: BuilderContext): Promise<string> {
  // We have already validated that the project name is set before calling this function.
  const projectName = context.target?.project;
  if (!projectName) {
    return context.workspaceRoot;
  }

  const projectMetadata = await context.getProjectMetadata(projectName);
  const sourceRoot = (projectMetadata.sourceRoot ?? projectMetadata.root ?? '') as string;

  return path.join(context.workspaceRoot, sourceRoot);
}

function normalizePolyfills(polyfills: string | string[] | undefined): string[] {
  if (typeof polyfills === 'string') {
    return [polyfills];
  }

  return polyfills ?? [];
}

async function collectEntrypoints(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  projectSourceRoot: string,
): Promise<Set<string>> {
  // Glob for files to test.
  const testFiles = await findTests(
    options.include ?? [],
    options.exclude ?? [],
    context.workspaceRoot,
    projectSourceRoot,
  );

  return new Set(testFiles);
}

async function initializeApplication(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  karmaOptions: ConfigOptions,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<Configuration>;
    karmaOptions?: (options: ConfigOptions) => ConfigOptions;
  } = {},
): Promise<
  [typeof import('karma'), Config & ConfigOptions, BuildOptions, AsyncIterator<Result> | null]
> {
  if (transforms.webpackConfiguration) {
    context.logger.warn(
      `This build is using the application builder but transforms.webpackConfiguration was provided. The transform will be ignored.`,
    );
  }

  const outputPath = path.join(context.workspaceRoot, 'dist/test-out', randomUUID());
  const projectSourceRoot = await getProjectSourceRoot(context);

  const [karma, entryPoints] = await Promise.all([
    import('karma'),
    collectEntrypoints(options, context, projectSourceRoot),
    fs.rm(outputPath, { recursive: true, force: true }),
  ]);

  let mainName = 'init_test_bed';
  if (options.main) {
    entryPoints.add(options.main);
    mainName = path.basename(options.main, path.extname(options.main));
  } else {
    entryPoints.add('@angular-devkit/build-angular/src/builders/karma/init_test_bed.js');
  }

  const instrumentForCoverage = options.codeCoverage
    ? createInstrumentationFilter(
        projectSourceRoot,
        getInstrumentationExcludedPaths(context.workspaceRoot, options.codeCoverageExclude ?? []),
      )
    : undefined;

  const buildOptions: BuildOptions = {
    entryPoints,
    tsConfig: options.tsConfig,
    outputPath,
    aot: false,
    index: false,
    outputHashing: OutputHashing.None,
    optimization: false,
    sourceMap: {
      scripts: true,
      styles: true,
      vendor: true,
    },
    instrumentForCoverage,
    styles: options.styles,
    polyfills: normalizePolyfills(options.polyfills),
    webWorkerTsConfig: options.webWorkerTsConfig,
    watch: options.watch ?? !karmaOptions.singleRun,
  };

  // Build tests with `application` builder, using test files as entry points.
  const [buildOutput, buildIterator] = await first(
    buildApplicationInternal(buildOptions, context),
    { cancel: !buildOptions.watch },
  );
  if (buildOutput.kind === ResultKind.Failure) {
    throw new ApplicationBuildError('Build failed');
  } else if (buildOutput.kind !== ResultKind.Full) {
    throw new ApplicationBuildError(
      'A full build result is required from the application builder.',
    );
  }

  // Write test files
  await writeTestFiles(buildOutput.files, buildOptions.outputPath);

  karmaOptions.files ??= [];
  karmaOptions.files.push(
    // Serve polyfills first.
    { pattern: `${outputPath}/polyfills.js`, type: 'module', watched: false },
    // Serve global setup script.
    { pattern: `${outputPath}/${mainName}.js`, type: 'module', watched: false },
    // Serve all source maps.
    { pattern: `${outputPath}/*.map`, included: false, watched: false },
  );

  if (hasChunkOrWorkerFiles(buildOutput.files)) {
    karmaOptions.files.push(
      // Allow loading of chunk-* files but don't include them all on load.
      {
        pattern: `${outputPath}/{chunk,worker}-*.js`,
        type: 'module',
        included: false,
        watched: false,
      },
    );
  }

  karmaOptions.files.push(
    // Serve remaining JS on page load, these are the test entrypoints.
    { pattern: `${outputPath}/*.js`, type: 'module', watched: false },
  );

  if (options.styles?.length) {
    // Serve CSS outputs on page load, these are the global styles.
    karmaOptions.files.push({ pattern: `${outputPath}/*.css`, type: 'css', watched: false });
  }

  const parsedKarmaConfig: Config & ConfigOptions = await karma.config.parseConfig(
    options.karmaConfig && path.resolve(context.workspaceRoot, options.karmaConfig),
    transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions,
    { promiseConfig: true, throwErrors: true },
  );

  // Remove the webpack plugin/framework:
  // Alternative would be to make the Karma plugin "smart" but that's a tall order
  // with managing unneeded imports etc..
  const pluginLengthBefore = (parsedKarmaConfig.plugins ?? []).length;
  parsedKarmaConfig.plugins = (parsedKarmaConfig.plugins ?? []).filter(
    (plugin: string | InlinePluginDef) => {
      if (typeof plugin === 'string') {
        return plugin !== 'framework:@angular-devkit/build-angular';
      }

      return !plugin['framework:@angular-devkit/build-angular'];
    },
  );
  parsedKarmaConfig.frameworks = parsedKarmaConfig.frameworks?.filter(
    (framework: string) => framework !== '@angular-devkit/build-angular',
  );
  const pluginLengthAfter = (parsedKarmaConfig.plugins ?? []).length;
  if (pluginLengthBefore !== pluginLengthAfter) {
    context.logger.warn(
      `Ignoring framework "@angular-devkit/build-angular" from karma config file because it's not compatible with the application builder.`,
    );
  }

  // When using code-coverage, auto-add karma-coverage.
  // This was done as part of the karma plugin for webpack.
  if (
    options.codeCoverage &&
    !parsedKarmaConfig.reporters?.some((r: string) => r === 'coverage' || r === 'coverage-istanbul')
  ) {
    parsedKarmaConfig.reporters = (parsedKarmaConfig.reporters ?? []).concat(['coverage']);
  }

  return [karma, parsedKarmaConfig, buildOptions, buildIterator];
}

function hasChunkOrWorkerFiles(files: Record<string, unknown>): boolean {
  return Object.keys(files).some((filename) => {
    return /(?:^|\/)(?:worker|chunk)[^/]+\.js$/.test(filename);
  });
}

export async function writeTestFiles(files: Record<string, ResultFile>, testDir: string) {
  const directoryExists = new Set<string>();
  // Writes the test related output files to disk and ensures the containing directories are present
  await emitFilesToDisk(Object.entries(files), async ([filePath, file]) => {
    if (file.type !== BuildOutputFileType.Browser && file.type !== BuildOutputFileType.Media) {
      return;
    }

    const fullFilePath = path.join(testDir, filePath);

    // Ensure output subdirectories exist
    const fileBasePath = path.dirname(fullFilePath);
    if (fileBasePath && !directoryExists.has(fileBasePath)) {
      await fs.mkdir(fileBasePath, { recursive: true });
      directoryExists.add(fileBasePath);
    }

    if (file.origin === 'memory') {
      // Write file contents
      await fs.writeFile(fullFilePath, file.contents);
    } else {
      // Copy file contents
      await fs.copyFile(file.inputPath, fullFilePath, fs.constants.COPYFILE_FICLONE);
    }
  });
}

/** Returns the first item yielded by the given generator and cancels the execution. */
async function first<T>(
  generator: AsyncIterable<T>,
  { cancel }: { cancel: boolean },
): Promise<[T, AsyncIterator<T> | null]> {
  if (!cancel) {
    const iterator: AsyncIterator<T> = generator[Symbol.asyncIterator]();
    const firstValue = await iterator.next();
    if (firstValue.done) {
      throw new Error('Expected generator to emit at least once.');
    }

    return [firstValue.value, iterator];
  }

  for await (const value of generator) {
    return [value, null];
  }

  throw new Error('Expected generator to emit at least once.');
}

function createInstrumentationFilter(includedBasePath: string, excludedPaths: Set<string>) {
  return (request: string): boolean => {
    return (
      !excludedPaths.has(request) &&
      !/\.(e2e|spec)\.tsx?$|[\\/]node_modules[\\/]/.test(request) &&
      request.startsWith(includedBasePath)
    );
  };
}

function getInstrumentationExcludedPaths(root: string, excludedPaths: string[]): Set<string> {
  const excluded = new Set<string>();

  for (const excludeGlob of excludedPaths) {
    const excludePath = excludeGlob[0] === '/' ? excludeGlob.slice(1) : excludeGlob;
    glob.sync(excludePath, { cwd: root }).forEach((p) => excluded.add(path.join(root, p)));
  }

  return excluded;
}
