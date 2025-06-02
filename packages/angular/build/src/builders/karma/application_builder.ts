/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { Config, ConfigOptions, FilePattern, InlinePluginDef, Server } from 'karma';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { ReadableStreamController } from 'node:stream/web';
import { globSync } from 'tinyglobby';
import { BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { emitFilesToDisk } from '../../tools/esbuild/utils';
import { createVirtualModulePlugin } from '../../tools/esbuild/virtual-module-plugin';
import { getProjectRootPaths } from '../../utils/project-metadata';
import { buildApplicationInternal } from '../application/index';
import { ApplicationBuilderInternalOptions } from '../application/options';
import { Result, ResultFile, ResultKind } from '../application/results';
import { OutputHashing } from '../application/schema';
import { findTests, getTestEntrypoints } from './find-tests';
import { Schema as KarmaBuilderOptions } from './schema';

const localResolve = createRequire(__filename).resolve;
const isWindows = process.platform === 'win32';

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

interface ServeFileFunction {
  (
    filepath: string,
    rangeHeader: string | string[] | undefined,
    response: ServerResponse,
    transform?: (c: string | Uint8Array) => string | Uint8Array,
    content?: string | Uint8Array,
    doNotCache?: boolean,
  ): void;
}

interface LatestBuildFiles {
  files: Record<string, ResultFile | undefined>;
}

const LATEST_BUILD_FILES_TOKEN = 'angularLatestBuildFiles';

class AngularAssetsMiddleware {
  static readonly $inject = ['serveFile', LATEST_BUILD_FILES_TOKEN];

  static readonly NAME = 'angular-test-assets';

  constructor(
    private readonly serveFile: ServeFileFunction,
    private readonly latestBuildFiles: LatestBuildFiles,
  ) {}

  handle(req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => unknown) {
    const url = new URL(`http://${req.headers['host']}${req.url}`);
    // Remove the leading slash from the URL path and convert to platform specific.
    // The latest build files will use the platform path separator.
    let pathname = url.pathname.slice(1);
    if (isWindows) {
      pathname = pathname.replaceAll(path.posix.sep, path.win32.sep);
    }

    const file = this.latestBuildFiles.files[pathname];
    if (!file) {
      next();

      return;
    }

    switch (file.origin) {
      case 'disk':
        this.serveFile(file.inputPath, undefined, res, undefined, undefined, /* doNotCache */ true);
        break;
      case 'memory':
        // Include pathname to help with Content-Type headers.
        this.serveFile(`/unused/${url.pathname}`, undefined, res, undefined, file.contents, true);
        break;
    }
  }

  static createPlugin(initialFiles: LatestBuildFiles): InlinePluginDef {
    return {
      [LATEST_BUILD_FILES_TOKEN]: ['value', { files: { ...initialFiles.files } }],

      [`middleware:${AngularAssetsMiddleware.NAME}`]: [
        'factory',
        Object.assign((...args: ConstructorParameters<typeof AngularAssetsMiddleware>) => {
          const inst = new AngularAssetsMiddleware(...args);

          return inst.handle.bind(inst);
        }, AngularAssetsMiddleware),
      ],
    };
  }
}

class AngularPolyfillsPlugin {
  static readonly $inject = ['config.files'];

  static readonly NAME = 'angular-polyfills';

  static createPlugin(
    polyfillsFile: FilePattern,
    jasmineCleanupFiles: FilePattern,
  ): InlinePluginDef {
    return {
      // This has to be a "reporter" because reporters run _after_ frameworks
      // and karma-jasmine-html-reporter injects additional scripts that may
      // depend on Jasmine but aren't modules - which means that they would run
      // _before_ all module code (including jasmine).
      [`reporter:${AngularPolyfillsPlugin.NAME}`]: [
        'factory',
        Object.assign((files: (string | FilePattern)[]) => {
          // The correct order is zone.js -> jasmine -> zone.js/testing.
          // Jasmine has to see the patched version of the global `setTimeout`
          // function so it doesn't cache the unpatched version. And /testing
          // needs to see the global `jasmine` object so it can patch it.
          const polyfillsIndex = 0;
          files.splice(polyfillsIndex, 0, polyfillsFile);

          // Insert just before test_main.js.
          const zoneTestingIndex = files.findIndex((f) => {
            if (typeof f === 'string') {
              return false;
            }

            return f.pattern.endsWith('/test_main.js');
          });
          if (zoneTestingIndex === -1) {
            throw new Error('Could not find test entrypoint file.');
          }
          files.splice(zoneTestingIndex, 0, jasmineCleanupFiles);

          // We need to ensure that all files are served as modules, otherwise
          // the order in the files list gets really confusing: Karma doesn't
          // set defer on scripts, so all scripts with type=js will run first,
          // even if type=module files appeared earlier in `files`.
          for (const f of files) {
            if (typeof f === 'string') {
              throw new Error(`Unexpected string-based file: "${f}"`);
            }
            if (f.included === false) {
              // Don't worry about files that aren't included on the initial
              // page load. `type` won't affect them.
              continue;
            }
            if (f.pattern.endsWith('.js') && 'js' === (f.type ?? 'js')) {
              f.type = 'module';
            }
          }

          // Add browser sourcemap support as a classic script
          files.unshift({
            pattern: localResolve('source-map-support/browser-source-map-support.js'),
            included: true,
            watched: false,
          });
        }, AngularPolyfillsPlugin),
      ],
    };
  }
}

function injectKarmaReporter(
  buildOptions: BuildOptions,
  buildIterator: AsyncIterator<Result>,
  karmaConfig: Config & ConfigOptions,
  controller: ReadableStreamController<BuilderOutput>,
) {
  const reporterName = 'angular-progress-notifier';

  interface RunCompleteInfo {
    exitCode: number;
  }

  interface KarmaEmitter {
    refreshFiles(): void;
  }

  class ProgressNotifierReporter {
    static $inject = ['emitter', LATEST_BUILD_FILES_TOKEN];

    constructor(
      private readonly emitter: KarmaEmitter,
      private readonly latestBuildFiles: LatestBuildFiles,
    ) {
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
            controller.enqueue({ success: false, message: 'Build failed' });
          } else if (
            buildOutput.kind === ResultKind.Incremental ||
            buildOutput.kind === ResultKind.Full
          ) {
            if (buildOutput.kind === ResultKind.Full) {
              this.latestBuildFiles.files = buildOutput.files;
            } else {
              this.latestBuildFiles.files = {
                ...this.latestBuildFiles.files,
                ...buildOutput.files,
              };
            }
            await writeTestFiles(buildOutput.files, buildOptions.outputPath);
            this.emitter.refreshFiles();
          }
        }
      })();
    }

    onRunComplete = function (_browsers: unknown, results: RunCompleteInfo) {
      if (results.exitCode === 0) {
        controller.enqueue({ success: true });
      } else {
        controller.enqueue({ success: false });
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
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: ConfigOptions) => ConfigOptions;
  } = {},
): AsyncIterable<BuilderOutput> {
  let karmaServer: Server;

  return new ReadableStream({
    async start(controller) {
      let init;
      try {
        init = await initializeApplication(options, context, karmaOptions, transforms);
      } catch (err) {
        if (err instanceof ApplicationBuildError) {
          controller.enqueue({ success: false, message: err.message });
          controller.close();

          return;
        }

        throw err;
      }

      const [karma, karmaConfig, buildOptions, buildIterator] = init;

      // If `--watch` is explicitly enabled or if we are keeping the Karma
      // process running, we should hook Karma into the build.
      if (buildIterator) {
        injectKarmaReporter(buildOptions, buildIterator, karmaConfig, controller);
      }

      // Close the stream once the Karma server returns.
      karmaServer = new karma.Server(karmaConfig as Config, (exitCode) => {
        controller.enqueue({ success: exitCode === 0 });
        controller.close();
      });

      await karmaServer.start();
    },
    async cancel() {
      await karmaServer?.stop();
    },
  });
}

async function getProjectSourceRoot(context: BuilderContext): Promise<string> {
  // We have already validated that the project name is set before calling this function.
  const projectName = context.target?.project;
  if (!projectName) {
    return context.workspaceRoot;
  }

  const projectMetadata = await context.getProjectMetadata(projectName);
  const { projectSourceRoot } = getProjectRootPaths(context.workspaceRoot, projectMetadata);

  return projectSourceRoot;
}

function normalizePolyfills(polyfills: string | string[] | undefined): [string[], string[]] {
  if (typeof polyfills === 'string') {
    polyfills = [polyfills];
  } else if (!polyfills) {
    polyfills = [];
  }

  const jasmineGlobalEntryPoint = localResolve('./polyfills/jasmine_global.js');
  const jasmineGlobalCleanupEntrypoint = localResolve('./polyfills/jasmine_global_cleanup.js');
  const sourcemapEntrypoint = localResolve('./polyfills/init_sourcemaps.js');

  const zoneTestingEntryPoint = 'zone.js/testing';
  const polyfillsExludingZoneTesting = polyfills.filter((p) => p !== zoneTestingEntryPoint);

  return [
    polyfillsExludingZoneTesting.concat([jasmineGlobalEntryPoint, sourcemapEntrypoint]),
    polyfillsExludingZoneTesting.length === polyfills.length
      ? [jasmineGlobalCleanupEntrypoint]
      : [jasmineGlobalCleanupEntrypoint, zoneTestingEntryPoint],
  ];
}

async function collectEntrypoints(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  projectSourceRoot: string,
): Promise<Map<string, string>> {
  // Glob for files to test.
  const testFiles = await findTests(
    options.include ?? [],
    options.exclude ?? [],
    context.workspaceRoot,
    projectSourceRoot,
  );

  return getTestEntrypoints(testFiles, { projectSourceRoot, workspaceRoot: context.workspaceRoot });
}

// eslint-disable-next-line max-lines-per-function
async function initializeApplication(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  karmaOptions: ConfigOptions,
  transforms: {
    karmaOptions?: (options: ConfigOptions) => ConfigOptions;
  } = {},
): Promise<
  [typeof import('karma'), Config & ConfigOptions, BuildOptions, AsyncIterator<Result> | null]
> {
  const outputPath = path.join(context.workspaceRoot, 'dist/test-out', randomUUID());
  const projectSourceRoot = await getProjectSourceRoot(context);

  const [karma, entryPoints] = await Promise.all([
    import('karma'),
    collectEntrypoints(options, context, projectSourceRoot),
    fs.rm(outputPath, { recursive: true, force: true }),
  ]);

  const mainName = 'test_main';
  if (options.main) {
    entryPoints.set(mainName, options.main);
  } else {
    entryPoints.set(mainName, 'angular:test-bed-init');
  }

  const instrumentForCoverage = options.codeCoverage
    ? createInstrumentationFilter(
        projectSourceRoot,
        getInstrumentationExcludedPaths(context.workspaceRoot, options.codeCoverageExclude ?? []),
      )
    : undefined;

  const [polyfills, jasmineCleanup] = normalizePolyfills(options.polyfills);
  for (let idx = 0; idx < jasmineCleanup.length; ++idx) {
    entryPoints.set(`jasmine-cleanup-${idx}`, jasmineCleanup[idx]);
  }

  const buildOptions: BuildOptions = {
    assets: options.assets,
    entryPoints,
    tsConfig: options.tsConfig,
    outputPath,
    preserveSymlinks: options.preserveSymlinks,
    aot: options.aot,
    index: false,
    outputHashing: OutputHashing.None,
    optimization: false,
    sourceMap: options.codeCoverage
      ? {
          scripts: true,
          styles: true,
          vendor: true,
        }
      : options.sourceMap,
    instrumentForCoverage,
    styles: options.styles,
    scripts: options.scripts,
    polyfills,
    webWorkerTsConfig: options.webWorkerTsConfig,
    watch: options.watch ?? !karmaOptions.singleRun,
    stylePreprocessorOptions: options.stylePreprocessorOptions,
    inlineStyleLanguage: options.inlineStyleLanguage,
    fileReplacements: options.fileReplacements,
    define: options.define,
    loader: options.loader,
    externalDependencies: options.externalDependencies,
  };

  const virtualTestBedInit = createVirtualModulePlugin({
    namespace: 'angular:test-bed-init',
    loadContent: async () => {
      const contents: string[] = [
        // Initialize the Angular testing environment
        `import { getTestBed } from '@angular/core/testing';`,
        `import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';`,
        `getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {`,
        `  errorOnUnknownElements: true,`,
        `  errorOnUnknownProperties: true,`,
        '});',
      ];

      return {
        contents: contents.join('\n'),
        loader: 'js',
        resolveDir: projectSourceRoot,
      };
    },
  });

  // Build tests with `application` builder, using test files as entry points.
  const [buildOutput, buildIterator] = await first(
    buildApplicationInternal(buildOptions, context, { codePlugins: [virtualTestBedInit] }),
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

  // We need to add this to the beginning *after* the testing framework has
  // prepended its files. The output path is required for each since they are
  // added later in the test process via a plugin.
  const polyfillsFile: FilePattern = {
    pattern: `${outputPath}/polyfills.js`,
    included: true,
    served: true,
    type: 'module',
    watched: false,
  };
  const jasmineCleanupFiles: FilePattern = {
    pattern: `${outputPath}/jasmine-cleanup-*.js`,
    included: true,
    served: true,
    type: 'module',
    watched: false,
  };

  karmaOptions.basePath = outputPath;

  karmaOptions.files ??= [];
  if (options.scripts?.length) {
    // This should be more granular to support named bundles.
    // However, it replicates the behavior of the Karma Webpack-based builder.
    karmaOptions.files.push({
      pattern: `scripts.js`,
      watched: false,
      type: 'js',
    });
  }

  karmaOptions.files.push(
    // Serve global setup script.
    { pattern: `${mainName}.js`, type: 'module', watched: false },
    // Serve all source maps.
    { pattern: `*.map`, included: false, watched: false },
    // These are the test entrypoints.
    { pattern: `spec-*.js`, type: 'module', watched: false },
  );

  if (hasChunkOrWorkerFiles(buildOutput.files)) {
    karmaOptions.files.push(
      // Allow loading of chunk-* files but don't include them all on load.
      {
        pattern: `{chunk,worker}-*.js`,
        type: 'module',
        included: false,
        watched: false,
      },
    );
  }

  if (options.styles?.length) {
    // Serve CSS outputs on page load, these are the global styles.
    karmaOptions.files.push({ pattern: `*.css`, type: 'css', watched: false });
  }

  const parsedKarmaConfig: Config & ConfigOptions = await karma.config.parseConfig(
    options.karmaConfig && path.resolve(context.workspaceRoot, options.karmaConfig),
    transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions,
    { promiseConfig: true, throwErrors: true },
  );

  // Check for jsdom which does not support executing ESM scripts.
  // If present, remove jsdom and issue a warning.
  const updatedBrowsers = parsedKarmaConfig.browsers?.filter((browser) => browser !== 'jsdom');
  if (parsedKarmaConfig.browsers?.length !== updatedBrowsers?.length) {
    parsedKarmaConfig.browsers = updatedBrowsers;
    context.logger.warn(
      `'jsdom' does not support ESM code execution and cannot be used for karma testing.` +
        ` The 'jsdom' entry has been removed from the 'browsers' option.`,
    );
  }

  // Remove the webpack plugin/framework:
  // Alternative would be to make the Karma plugin "smart" but that's a tall order
  // with managing unneeded imports etc..
  parsedKarmaConfig.plugins ??= [];
  const pluginLengthBefore = parsedKarmaConfig.plugins.length;
  parsedKarmaConfig.plugins = parsedKarmaConfig.plugins.filter(
    (plugin: string | InlinePluginDef) => {
      if (typeof plugin === 'string') {
        return plugin !== 'framework:@angular-devkit/build-angular';
      }

      return !plugin['framework:@angular-devkit/build-angular'];
    },
  );
  parsedKarmaConfig.frameworks ??= [];
  parsedKarmaConfig.frameworks = parsedKarmaConfig.frameworks.filter(
    (framework: string) => framework !== '@angular-devkit/build-angular',
  );
  const pluginLengthAfter = parsedKarmaConfig.plugins.length;
  if (pluginLengthBefore !== pluginLengthAfter) {
    context.logger.warn(
      `Ignoring framework "@angular-devkit/build-angular" from karma config file because it's not compatible with the application builder.`,
    );
  }

  parsedKarmaConfig.plugins.push(AngularAssetsMiddleware.createPlugin(buildOutput));
  parsedKarmaConfig.middleware ??= [];
  parsedKarmaConfig.middleware.push(AngularAssetsMiddleware.NAME);

  parsedKarmaConfig.plugins.push(
    AngularPolyfillsPlugin.createPlugin(polyfillsFile, jasmineCleanupFiles),
  );
  parsedKarmaConfig.reporters ??= [];
  parsedKarmaConfig.reporters.push(AngularPolyfillsPlugin.NAME);

  // Adjust karma junit reporter outDir location to maintain previous (devkit) behavior
  // The base path for the reporter was previously the workspace root.
  // To keep the files in the same location, the reporter's output directory is adjusted
  // to be relative to the workspace root when using junit.
  if (parsedKarmaConfig.reporters?.some((reporter) => reporter === 'junit')) {
    if ('junitReporter' in parsedKarmaConfig) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const junitReporterOptions = (parsedKarmaConfig as any)['junitReporter'] as {
        outputDir?: unknown;
      };
      if (junitReporterOptions.outputDir == undefined) {
        junitReporterOptions.outputDir = context.workspaceRoot;
      } else if (
        typeof junitReporterOptions.outputDir === 'string' &&
        !path.isAbsolute(junitReporterOptions.outputDir)
      ) {
        junitReporterOptions.outputDir = path.join(
          context.workspaceRoot,
          junitReporterOptions.outputDir,
        );
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (parsedKarmaConfig as any)['junitReporter'] = {
        outputDir: context.workspaceRoot,
      };
    }
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
    globSync(excludePath, { cwd: root }).forEach((p) => excluded.add(path.join(root, p)));
  }

  return excluded;
}
