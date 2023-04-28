/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import type { BuildOptions, Metafile, OutputFile } from 'esbuild';
import assert from 'node:assert';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { copyAssets } from '../../utils/copy-assets';
import { assertIsError } from '../../utils/error';
import { transformSupportedBrowsersToTargets } from '../../utils/esbuild-targets';
import { FileInfo } from '../../utils/index-file/augment-index-html';
import { IndexHtmlGenerator } from '../../utils/index-file/index-html-generator';
import { augmentAppWithServiceWorkerEsbuild } from '../../utils/service-worker';
import { Spinner } from '../../utils/spinner';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { BundleStats, generateBuildStatsTable } from '../../webpack/utils/stats';
import { SourceFileCache, createCompilerPlugin } from './angular/compiler-plugin';
import { logBuilderStatusWarnings } from './builder-status-warnings';
import { checkCommonJSModules } from './commonjs-checker';
import { BundlerContext, logMessages } from './esbuild';
import { createGlobalScriptsBundleOptions } from './global-scripts';
import { extractLicenses } from './license-extractor';
import { LoadResultCache } from './load-result-cache';
import { BrowserEsbuildOptions, NormalizedBrowserOptions, normalizeOptions } from './options';
import { Schema as BrowserBuilderOptions } from './schema';
import { createSourcemapIngorelistPlugin } from './sourcemap-ignorelist-plugin';
import { createStylesheetBundleOptions } from './stylesheets/bundle-options';
import { shutdownSassWorkerPool } from './stylesheets/sass-plugin';
import type { ChangedFiles } from './watcher';

interface RebuildState {
  codeRebuild?: BundlerContext;
  globalStylesRebuild?: BundlerContext;
  codeBundleCache?: SourceFileCache;
  fileChanges: ChangedFiles;
}

/**
 * Represents the result of a single builder execute call.
 */
class ExecutionResult {
  readonly outputFiles: OutputFile[] = [];
  readonly assetFiles: { source: string; destination: string }[] = [];

  constructor(
    private codeRebuild?: BundlerContext,
    private globalStylesRebuild?: BundlerContext,
    private codeBundleCache?: SourceFileCache,
  ) {}

  addOutputFile(path: string, content: string): void {
    this.outputFiles.push(createOutputFileFromText(path, content));
  }

  get output() {
    return {
      success: this.outputFiles.length > 0,
    };
  }

  get outputWithFiles() {
    return {
      success: this.outputFiles.length > 0,
      outputFiles: this.outputFiles,
      assetFiles: this.assetFiles,
    };
  }

  createRebuildState(fileChanges: ChangedFiles): RebuildState {
    this.codeBundleCache?.invalidate([...fileChanges.modified, ...fileChanges.removed]);

    return {
      codeRebuild: this.codeRebuild,
      globalStylesRebuild: this.globalStylesRebuild,
      codeBundleCache: this.codeBundleCache,
      fileChanges,
    };
  }

  async dispose(): Promise<void> {
    await Promise.allSettled([this.codeRebuild?.dispose(), this.globalStylesRebuild?.dispose()]);
  }
}

async function execute(
  options: NormalizedBrowserOptions,
  context: BuilderContext,
  rebuildState?: RebuildState,
): Promise<ExecutionResult> {
  const startTime = process.hrtime.bigint();

  const {
    projectRoot,
    workspaceRoot,
    optimizationOptions,
    assets,
    serviceWorkerOptions,
    indexHtmlOptions,
  } = options;

  const browsers = getSupportedBrowsers(projectRoot, context.logger);
  const target = transformSupportedBrowsersToTargets(browsers);

  // Reuse rebuild state or create new bundle contexts for code and global stylesheets
  const bundlerContexts = [];

  // Application code
  const codeBundleCache = options.watch
    ? rebuildState?.codeBundleCache ?? new SourceFileCache()
    : undefined;
  const codeBundleContext =
    rebuildState?.codeRebuild ??
    new BundlerContext(
      workspaceRoot,
      !!options.watch,
      createCodeBundleOptions(options, target, browsers, codeBundleCache),
    );
  bundlerContexts.push(codeBundleContext);
  // Global Stylesheets
  let globalStylesBundleContext;
  if (options.globalStyles.length > 0) {
    globalStylesBundleContext =
      rebuildState?.globalStylesRebuild ??
      new BundlerContext(
        workspaceRoot,
        !!options.watch,
        createGlobalStylesBundleOptions(
          options,
          target,
          browsers,
          codeBundleCache?.loadResultCache,
        ),
      );
    bundlerContexts.push(globalStylesBundleContext);
  }
  // Global Scripts
  if (options.globalScripts.length > 0) {
    const globalScriptsBundleContext = new BundlerContext(
      workspaceRoot,
      !!options.watch,
      createGlobalScriptsBundleOptions(options),
    );
    bundlerContexts.push(globalScriptsBundleContext);
  }

  const bundlingResult = await BundlerContext.bundleAll(bundlerContexts);

  // Log all warnings and errors generated during bundling
  await logMessages(context, bundlingResult);

  const executionResult = new ExecutionResult(
    codeBundleContext,
    globalStylesBundleContext,
    codeBundleCache,
  );

  // Return if the bundling has errors
  if (bundlingResult.errors) {
    return executionResult;
  }

  // Filter global stylesheet initial files. Currently all initial CSS files are from the global styles option.
  if (options.globalStyles.length > 0) {
    bundlingResult.initialFiles = bundlingResult.initialFiles.filter(
      ({ file, name }) =>
        !file.endsWith('.css') ||
        options.globalStyles.find((style) => style.name === name)?.initial,
    );
  }

  const { metafile, initialFiles, outputFiles } = bundlingResult;

  executionResult.outputFiles.push(...outputFiles);

  // Check metafile for CommonJS module usage if optimizing scripts
  if (optimizationOptions.scripts) {
    const messages = checkCommonJSModules(metafile, options.allowedCommonJsDependencies);
    await logMessages(context, { warnings: messages });
  }

  // Generate index HTML file
  if (indexHtmlOptions) {
    // Create an index HTML generator that reads from the in-memory output files
    const indexHtmlGenerator = new IndexHtmlGenerator({
      indexPath: indexHtmlOptions.input,
      entrypoints: indexHtmlOptions.insertionOrder,
      sri: options.subresourceIntegrity,
      optimization: optimizationOptions,
      crossOrigin: options.crossOrigin,
    });

    /** Virtual output path to support reading in-memory files. */
    const virtualOutputPath = '/';
    indexHtmlGenerator.readAsset = async function (filePath: string): Promise<string> {
      // Remove leading directory separator
      const relativefilePath = path.relative(virtualOutputPath, filePath);
      const file = executionResult.outputFiles.find((file) => file.path === relativefilePath);
      if (file) {
        return file.text;
      }

      throw new Error(`Output file does not exist: ${path}`);
    };

    const { content, warnings, errors } = await indexHtmlGenerator.process({
      baseHref: options.baseHref,
      lang: undefined,
      outputPath: virtualOutputPath,
      files: initialFiles,
    });

    for (const error of errors) {
      context.logger.error(error);
    }
    for (const warning of warnings) {
      context.logger.warn(warning);
    }

    executionResult.addOutputFile(indexHtmlOptions.output, content);
  }

  // Copy assets
  if (assets) {
    // The webpack copy assets helper is used with no base paths defined. This prevents the helper
    // from directly writing to disk. This should eventually be replaced with a more optimized helper.
    executionResult.assetFiles.push(...(await copyAssets(assets, [], workspaceRoot)));
  }

  // Write metafile if stats option is enabled
  if (options.stats) {
    executionResult.addOutputFile('stats.json', JSON.stringify(metafile, null, 2));
  }

  // Extract and write licenses for used packages
  if (options.extractLicenses) {
    executionResult.addOutputFile(
      '3rdpartylicenses.txt',
      await extractLicenses(metafile, workspaceRoot),
    );
  }

  // Augment the application with service worker support
  if (serviceWorkerOptions) {
    try {
      const serviceWorkerResult = await augmentAppWithServiceWorkerEsbuild(
        workspaceRoot,
        serviceWorkerOptions,
        options.baseHref || '/',
        executionResult.outputFiles,
        executionResult.assetFiles,
      );
      executionResult.addOutputFile('ngsw.json', serviceWorkerResult.manifest);
      executionResult.assetFiles.push(...serviceWorkerResult.assetFiles);
    } catch (error) {
      context.logger.error(error instanceof Error ? error.message : `${error}`);

      return executionResult;
    }
  }

  logBuildStats(context, metafile, initialFiles);

  const buildTime = Number(process.hrtime.bigint() - startTime) / 10 ** 9;
  context.logger.info(`Application bundle generation complete. [${buildTime.toFixed(3)} seconds]`);

  return executionResult;
}

async function writeResultFiles(
  outputFiles: OutputFile[],
  assetFiles: { source: string; destination: string }[] | undefined,
  outputPath: string,
) {
  const directoryExists = new Set<string>();
  await Promise.all(
    outputFiles.map(async (file) => {
      // Ensure output subdirectories exist
      const basePath = path.dirname(file.path);
      if (basePath && !directoryExists.has(basePath)) {
        await fs.mkdir(path.join(outputPath, basePath), { recursive: true });
        directoryExists.add(basePath);
      }
      // Write file contents
      await fs.writeFile(path.join(outputPath, file.path), file.contents);
    }),
  );

  if (assetFiles?.length) {
    await Promise.all(
      assetFiles.map(async ({ source, destination }) => {
        // Ensure output subdirectories exist
        const basePath = path.dirname(destination);
        if (basePath && !directoryExists.has(basePath)) {
          await fs.mkdir(path.join(outputPath, basePath), { recursive: true });
          directoryExists.add(basePath);
        }
        // Copy file contents
        await fs.copyFile(source, path.join(outputPath, destination), fsConstants.COPYFILE_FICLONE);
      }),
    );
  }
}

function createOutputFileFromText(path: string, text: string): OutputFile {
  return {
    path,
    text,
    get contents() {
      return Buffer.from(this.text, 'utf-8');
    },
  };
}

function createCodeBundleOptions(
  options: NormalizedBrowserOptions,
  target: string[],
  browsers: string[],
  sourceFileCache?: SourceFileCache,
): BuildOptions {
  const {
    workspaceRoot,
    entryPoints,
    optimizationOptions,
    sourcemapOptions,
    tsconfig,
    outputNames,
    outExtension,
    fileReplacements,
    externalDependencies,
    preserveSymlinks,
    stylePreprocessorOptions,
    advancedOptimizations,
    inlineStyleLanguage,
    jit,
    tailwindConfiguration,
  } = options;

  const buildOptions: BuildOptions = {
    absWorkingDir: workspaceRoot,
    bundle: true,
    format: 'esm',
    entryPoints,
    entryNames: outputNames.bundles,
    assetNames: outputNames.media,
    target,
    supported: getFeatureSupport(target),
    mainFields: ['es2020', 'browser', 'module', 'main'],
    conditions: ['es2020', 'es2015', 'module'],
    resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
    metafile: true,
    legalComments: options.extractLicenses ? 'none' : 'eof',
    logLevel: options.verbose ? 'debug' : 'silent',
    minify: optimizationOptions.scripts,
    pure: ['forwardRef'],
    outdir: workspaceRoot,
    outExtension: outExtension ? { '.js': `.${outExtension}` } : undefined,
    sourcemap: sourcemapOptions.scripts && (sourcemapOptions.hidden ? 'external' : true),
    splitting: true,
    tsconfig,
    external: externalDependencies,
    write: false,
    platform: 'browser',
    preserveSymlinks,
    plugins: [
      createSourcemapIngorelistPlugin(),
      createCompilerPlugin(
        // JS/TS options
        {
          sourcemap: !!sourcemapOptions.scripts,
          thirdPartySourcemaps: sourcemapOptions.vendor,
          tsconfig,
          jit,
          advancedOptimizations,
          fileReplacements,
          sourceFileCache,
          loadResultCache: sourceFileCache?.loadResultCache,
        },
        // Component stylesheet options
        {
          workspaceRoot,
          optimization: !!optimizationOptions.styles.minify,
          sourcemap:
            // Hidden component stylesheet sourcemaps are inaccessible which is effectively
            // the same as being disabled. Disabling has the advantage of avoiding the overhead
            // of sourcemap processing.
            !!sourcemapOptions.styles && (sourcemapOptions.hidden ? false : 'inline'),
          outputNames,
          includePaths: stylePreprocessorOptions?.includePaths,
          externalDependencies,
          target,
          inlineStyleLanguage,
          preserveSymlinks,
          browsers,
          tailwindConfiguration,
        },
      ),
    ],
    define: {
      // Only set to false when script optimizations are enabled. It should not be set to true because
      // Angular turns `ngDevMode` into an object for development debugging purposes when not defined
      // which a constant true value would break.
      ...(optimizationOptions.scripts ? { 'ngDevMode': 'false' } : undefined),
      'ngJitMode': jit ? 'true' : 'false',
    },
  };

  const polyfills = options.polyfills ? [...options.polyfills] : [];
  if (jit) {
    polyfills.push('@angular/compiler');
  }

  if (polyfills?.length) {
    const namespace = 'angular:polyfills';
    buildOptions.entryPoints = {
      ...buildOptions.entryPoints,
      ['polyfills']: namespace,
    };

    buildOptions.plugins?.unshift({
      name: 'angular-polyfills',
      setup(build) {
        build.onResolve({ filter: /^angular:polyfills$/ }, (args) => {
          if (args.kind !== 'entry-point') {
            return null;
          }

          return {
            path: 'entry',
            namespace,
          };
        });
        build.onLoad({ filter: /./, namespace }, () => {
          return {
            contents: polyfills.map((file) => `import '${file.replace(/\\/g, '/')}';`).join('\n'),
            loader: 'js',
            resolveDir: workspaceRoot,
          };
        });
      },
    });
  }

  return buildOptions;
}

/**
 * Generates a syntax feature object map for Angular applications based on a list of targets.
 * A full set of feature names can be found here: https://esbuild.github.io/api/#supported
 * @param target An array of browser/engine targets in the format accepted by the esbuild `target` option.
 * @returns An object that can be used with the esbuild build `supported` option.
 */
function getFeatureSupport(target: string[]): BuildOptions['supported'] {
  const supported: Record<string, boolean> = {
    // Native async/await is not supported with Zone.js. Disabling support here will cause
    // esbuild to downlevel async/await and for await...of to a Zone.js supported form. However, esbuild
    // does not currently support downleveling async generators. Instead babel is used within the JS/TS
    // loader to perform the downlevel transformation.
    // NOTE: If esbuild adds support in the future, the babel support for async generators can be disabled.
    'async-await': false,
    // V8 currently has a performance defect involving object spread operations that can cause signficant
    // degradation in runtime performance. By not supporting the language feature here, a downlevel form
    // will be used instead which provides a workaround for the performance issue.
    // For more details: https://bugs.chromium.org/p/v8/issues/detail?id=11536
    'object-rest-spread': false,
  };

  // Detect Safari browser versions that have a class field behavior bug
  // See: https://github.com/angular/angular-cli/issues/24355#issuecomment-1333477033
  // See: https://github.com/WebKit/WebKit/commit/e8788a34b3d5f5b4edd7ff6450b80936bff396f2
  let safariClassFieldScopeBug = false;
  for (const browser of target) {
    let majorVersion;
    if (browser.startsWith('ios')) {
      majorVersion = Number(browser.slice(3, 5));
    } else if (browser.startsWith('safari')) {
      majorVersion = Number(browser.slice(6, 8));
    } else {
      continue;
    }
    // Technically, 14.0 is not broken but rather does not have support. However, the behavior
    // is identical since it would be set to false by esbuild if present as a target.
    if (majorVersion === 14 || majorVersion === 15) {
      safariClassFieldScopeBug = true;
      break;
    }
  }
  // If class field support cannot be used set to false; otherwise leave undefined to allow
  // esbuild to use `target` to determine support.
  if (safariClassFieldScopeBug) {
    supported['class-field'] = false;
    supported['class-static-field'] = false;
  }

  return supported;
}

function createGlobalStylesBundleOptions(
  options: NormalizedBrowserOptions,
  target: string[],
  browsers: string[],
  cache?: LoadResultCache,
): BuildOptions {
  const {
    workspaceRoot,
    optimizationOptions,
    sourcemapOptions,
    outputNames,
    globalStyles,
    preserveSymlinks,
    externalDependencies,
    stylePreprocessorOptions,
    tailwindConfiguration,
  } = options;

  const buildOptions = createStylesheetBundleOptions(
    {
      workspaceRoot,
      optimization: !!optimizationOptions.styles.minify,
      sourcemap: !!sourcemapOptions.styles,
      preserveSymlinks,
      target,
      externalDependencies,
      outputNames,
      includePaths: stylePreprocessorOptions?.includePaths,
      browsers,
      tailwindConfiguration,
    },
    cache,
  );
  buildOptions.legalComments = options.extractLicenses ? 'none' : 'eof';

  const namespace = 'angular:styles/global';
  buildOptions.entryPoints = {};
  for (const { name } of globalStyles) {
    buildOptions.entryPoints[name] = `${namespace};${name}`;
  }

  buildOptions.plugins.unshift({
    name: 'angular-global-styles',
    setup(build) {
      build.onResolve({ filter: /^angular:styles\/global;/ }, (args) => {
        if (args.kind !== 'entry-point') {
          return null;
        }

        return {
          path: args.path.split(';', 2)[1],
          namespace,
        };
      });
      build.onLoad({ filter: /./, namespace }, (args) => {
        const files = globalStyles.find(({ name }) => name === args.path)?.files;
        assert(files, `global style name should always be found [${args.path}]`);

        return {
          contents: files.map((file) => `@import '${file.replace(/\\/g, '/')}';`).join('\n'),
          loader: 'css',
          resolveDir: workspaceRoot,
        };
      });
    },
  });

  return buildOptions;
}

async function withSpinner<T>(text: string, action: () => T | Promise<T>): Promise<T> {
  const spinner = new Spinner(text);
  spinner.start();

  try {
    return await action();
  } finally {
    spinner.stop();
  }
}

async function withNoProgress<T>(test: string, action: () => T | Promise<T>): Promise<T> {
  return action();
}

/**
 * Main execution function for the esbuild-based application builder.
 * The options are compatible with the Webpack-based builder.
 * @param userOptions The browser builder options to use when setting up the application build
 * @param context The Architect builder context object
 * @returns An async iterable with the builder result output
 */
export function buildEsbuildBrowser(
  userOptions: BrowserBuilderOptions,
  context: BuilderContext,
  infrastructureSettings?: {
    write?: boolean;
  },
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: OutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  return buildEsbuildBrowserInternal(userOptions, context, infrastructureSettings);
}

/**
 * Internal version of the main execution function for the esbuild-based application builder.
 * Exposes some additional "private" options in addition to those exposed by the schema.
 * @param userOptions The browser-esbuild builder options to use when setting up the application build
 * @param context The Architect builder context object
 * @returns An async iterable with the builder result output
 */
export async function* buildEsbuildBrowserInternal(
  userOptions: BrowserEsbuildOptions,
  context: BuilderContext,
  infrastructureSettings?: {
    write?: boolean;
  },
): AsyncIterable<
  BuilderOutput & {
    outputFiles?: OutputFile[];
    assetFiles?: { source: string; destination: string }[];
  }
> {
  // Inform user of status of builder and options
  logBuilderStatusWarnings(userOptions, context);

  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The 'browser-esbuild' builder requires a target to be specified.`);

    return;
  }

  const normalizedOptions = await normalizeOptions(context, projectName, userOptions);
  // Writing the result to the filesystem is the default behavior
  const shouldWriteResult = infrastructureSettings?.write !== false;

  if (shouldWriteResult) {
    // Clean output path if enabled
    if (userOptions.deleteOutputPath) {
      if (normalizedOptions.outputPath === normalizedOptions.workspaceRoot) {
        context.logger.error('Output path MUST not be workspace root directory!');

        return;
      }

      await fs.rm(normalizedOptions.outputPath, { force: true, recursive: true, maxRetries: 3 });
    }

    // Create output directory if needed
    try {
      await fs.mkdir(normalizedOptions.outputPath, { recursive: true });
    } catch (e) {
      assertIsError(e);
      context.logger.error('Unable to create output directory: ' + e.message);

      return;
    }
  }

  const withProgress: typeof withSpinner = normalizedOptions.progress
    ? withSpinner
    : withNoProgress;

  // Initial build
  let result: ExecutionResult;
  try {
    result = await withProgress('Building...', () => execute(normalizedOptions, context));

    if (shouldWriteResult) {
      // Write output files
      await writeResultFiles(result.outputFiles, result.assetFiles, normalizedOptions.outputPath);

      yield result.output;
    } else {
      // Requires casting due to unneeded `JsonObject` requirement. Remove once fixed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yield result.outputWithFiles as any;
    }

    // Finish if watch mode is not enabled
    if (!userOptions.watch) {
      return;
    }
  } finally {
    // Ensure Sass workers are shutdown if not watching
    if (!userOptions.watch) {
      shutdownSassWorkerPool();
    }
  }

  if (normalizedOptions.progress) {
    context.logger.info('Watch mode enabled. Watching for file changes...');
  }

  // Setup a watcher
  const { createWatcher } = await import('./watcher');
  const watcher = createWatcher({
    polling: typeof userOptions.poll === 'number',
    interval: userOptions.poll,
    ignored: [
      // Ignore the output and cache paths to avoid infinite rebuild cycles
      normalizedOptions.outputPath,
      normalizedOptions.cacheOptions.basePath,
      // Ignore all node modules directories to avoid excessive file watchers.
      // Package changes are handled below by watching manifest and lock files.
      '**/node_modules/**',
    ],
  });

  // Temporarily watch the entire project
  watcher.add(normalizedOptions.projectRoot);

  // Watch workspace for package manager changes
  const packageWatchFiles = [
    // manifest can affect module resolution
    'package.json',
    // npm lock file
    'package-lock.json',
    // pnpm lock file
    'pnpm-lock.yaml',
    // yarn lock file including Yarn PnP manifest files (https://yarnpkg.com/advanced/pnp-spec/)
    'yarn.lock',
    '.pnp.cjs',
    '.pnp.data.json',
  ];
  watcher.add(packageWatchFiles.map((file) => path.join(normalizedOptions.workspaceRoot, file)));

  // Wait for changes and rebuild as needed
  try {
    for await (const changes of watcher) {
      if (userOptions.verbose) {
        context.logger.info(changes.toDebugString());
      }

      result = await withProgress('Changes detected. Rebuilding...', () =>
        execute(normalizedOptions, context, result.createRebuildState(changes)),
      );

      if (shouldWriteResult) {
        // Write output files
        await writeResultFiles(result.outputFiles, result.assetFiles, normalizedOptions.outputPath);

        yield result.output;
      } else {
        // Requires casting due to unneeded `JsonObject` requirement. Remove once fixed.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yield result.outputWithFiles as any;
      }
    }
  } finally {
    // Stop the watcher
    await watcher.close();
    // Cleanup incremental rebuild state
    await result.dispose();
    shutdownSassWorkerPool();
  }
}

export default createBuilder(buildEsbuildBrowser);

function logBuildStats(context: BuilderContext, metafile: Metafile, initialFiles: FileInfo[]) {
  const initial = new Map(initialFiles.map((info) => [info.file, info.name]));
  const stats: BundleStats[] = [];
  for (const [file, output] of Object.entries(metafile.outputs)) {
    // Only display JavaScript and CSS files
    if (!file.endsWith('.js') && !file.endsWith('.css')) {
      continue;
    }
    // Skip internal component resources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((output as any)['ng-component']) {
      continue;
    }

    stats.push({
      initial: initial.has(file),
      stats: [file, initial.get(file) ?? '-', output.bytes, ''],
    });
  }

  const tableText = generateBuildStatsTable(stats, true, true, false, undefined);

  context.logger.info('\n' + tableText + '\n');
}
