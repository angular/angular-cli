/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type {
  BuildFailure,
  Loader,
  Metafile,
  OnStartResult,
  OutputFile,
  PartialMessage,
  PartialNote,
  Plugin,
  PluginBuild,
} from 'esbuild';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { maxWorkers, useTypeChecking } from '../../../utils/environment-options';
import { AngularHostOptions } from '../../angular/angular-host';
import { AngularCompilation, DiagnosticModes, NoopCompilation } from '../../angular/compilation';
import { JavaScriptTransformer } from '../javascript-transformer';
import { LoadResultCache, createCachedLoad } from '../load-result-cache';
import { logCumulativeDurations, profileAsync, resetCumulativeDurations } from '../profiling';
import { SharedTSCompilationState, getSharedCompilationState } from './compilation-state';
import { ComponentStylesheetBundler } from './component-stylesheets';
import { FileReferenceTracker } from './file-reference-tracker';
import { setupJitPluginCallbacks } from './jit-plugin-callbacks';
import { rewriteForBazel } from './rewrite-bazel-paths';
import { SourceFileCache } from './source-file-cache';

export interface CompilerPluginOptions {
  sourcemap: boolean | 'external';
  tsconfig: string;
  jit?: boolean;

  /**
   * Include class metadata and JIT information in built code.
   * The Angular TestBed APIs require additional metadata for the Angular aspects of the application
   * such as Components, Modules, Pipes, etc.
   * TestBed may also leverage JIT capabilities during testing (e.g., overrideComponent).
   */
  includeTestMetadata?: boolean;

  advancedOptimizations?: boolean;
  thirdPartySourcemaps?: boolean;
  fileReplacements?: Record<string, string>;
  sourceFileCache?: SourceFileCache;
  loadResultCache?: LoadResultCache;
  incremental: boolean;
  externalRuntimeStyles?: boolean;
  instrumentForCoverage?: (request: string) => boolean;
  templateUpdates?: Map<string, string>;
}

// eslint-disable-next-line max-lines-per-function
export function createCompilerPlugin(
  pluginOptions: CompilerPluginOptions,
  compilationOrFactory: AngularCompilation | (() => Promise<AngularCompilation>),
  stylesheetBundler: ComponentStylesheetBundler,
): Plugin {
  return {
    name: 'angular-compiler',
    // eslint-disable-next-line max-lines-per-function
    async setup(build: PluginBuild): Promise<void> {
      let setupWarnings: PartialMessage[] | undefined = [];
      const preserveSymlinks = build.initialOptions.preserveSymlinks;

      // Initialize a worker pool for JavaScript transformations.
      // Webcontainers currently do not support this persistent cache store.
      let cacheStore: import('../lmdb-cache-store').LmdbCacheStore | undefined;
      if (pluginOptions.sourceFileCache?.persistentCachePath && !process.versions.webcontainer) {
        try {
          const { LmdbCacheStore } = await import('../lmdb-cache-store');
          cacheStore = new LmdbCacheStore(
            path.join(pluginOptions.sourceFileCache.persistentCachePath, 'angular-compiler.db'),
          );
        } catch (e) {
          setupWarnings.push({
            text: 'Unable to initialize JavaScript cache storage.',
            location: null,
            notes: [
              // Only show first line of lmdb load error which has platform support listed
              { text: (e as Error)?.message.split('\n')[0] ?? `${e}` },
              {
                text: 'This will not affect the build output content but may result in slower builds.',
              },
            ],
          });
        }
      }
      const javascriptTransformer = new JavaScriptTransformer(
        {
          sourcemap: !!pluginOptions.sourcemap,
          thirdPartySourcemaps: pluginOptions.thirdPartySourcemaps,
          advancedOptimizations: pluginOptions.advancedOptimizations,
          jit: pluginOptions.jit || pluginOptions.includeTestMetadata,
        },
        maxWorkers,
        cacheStore?.createCache('jstransformer'),
      );

      // Setup defines based on the values used by the Angular compiler-cli
      build.initialOptions.define ??= {};
      build.initialOptions.define['ngI18nClosureMode'] ??= 'false';

      // The factory is only relevant for compatibility purposes with the private API.
      // TODO: Update private API in the next major to allow compilation function factory removal here.
      const compilation =
        typeof compilationOrFactory === 'function'
          ? await compilationOrFactory()
          : compilationOrFactory;

      // The in-memory cache of TypeScript file outputs will be used during the build in `onLoad` callbacks for TS files.
      // A string value indicates direct TS/NG output and a Uint8Array indicates fully transformed code.
      const typeScriptFileCache =
        pluginOptions.sourceFileCache?.typeScriptFileCache ??
        new Map<string, string | Uint8Array>();

      // The resources from component stylesheets and web workers that will be added to the build results output files
      const additionalResults = new Map<
        string,
        { outputFiles?: OutputFile[]; metafile?: Metafile; errors?: PartialMessage[] }
      >();

      // Compilation is initially assumed to have errors until emitted
      let hasCompilationErrors = true;

      // Determines if TypeScript should process JavaScript files based on tsconfig `allowJs` option
      let shouldTsIgnoreJs = true;
      // Determines if transpilation should be handle by TypeScript or esbuild
      let useTypeScriptTranspilation = true;

      let sharedTSCompilationState: SharedTSCompilationState | undefined;

      // To fully invalidate files, track resource referenced files and their referencing source
      const referencedFileTracker = new FileReferenceTracker();

      // eslint-disable-next-line max-lines-per-function
      build.onStart(async () => {
        sharedTSCompilationState = getSharedCompilationState();
        if (!(compilation instanceof NoopCompilation)) {
          sharedTSCompilationState.markAsInProgress();
        }

        const result: OnStartResult = {
          warnings: setupWarnings,
        };

        // Reset debug performance tracking
        resetCumulativeDurations();

        // Update the reference tracker and generate a full set of modified files for the
        // Angular compiler which does not have direct knowledge of transitive resource
        // dependencies or web worker processing.
        let modifiedFiles;
        if (
          !(compilation instanceof NoopCompilation) &&
          pluginOptions.sourceFileCache?.modifiedFiles.size
        ) {
          // TODO: Differentiate between changed input files and stale output files
          modifiedFiles = referencedFileTracker.update(pluginOptions.sourceFileCache.modifiedFiles);
          pluginOptions.sourceFileCache.invalidate(modifiedFiles);
          // External runtime styles are invalidated and rebuilt at the beginning of a rebuild to avoid
          // the need to execute the application bundler for component style only changes.
          if (!pluginOptions.externalRuntimeStyles) {
            stylesheetBundler.invalidate(modifiedFiles);
          }
          // Remove any stale additional results based on modified files
          modifiedFiles.forEach((file) => additionalResults.delete(file));
        }

        if (compilation.update && pluginOptions.sourceFileCache?.modifiedFiles.size) {
          await compilation.update(modifiedFiles ?? pluginOptions.sourceFileCache.modifiedFiles);
        }

        // Create Angular compiler host options
        const hostOptions: AngularHostOptions = {
          fileReplacements: pluginOptions.fileReplacements,
          modifiedFiles,
          sourceFileCache: pluginOptions.sourceFileCache,
          async transformStylesheet(data, containingFile, stylesheetFile, order, className) {
            let stylesheetResult;
            let resultSource = stylesheetFile ?? containingFile;

            // Stylesheet file only exists for external stylesheets
            if (stylesheetFile) {
              stylesheetResult = await stylesheetBundler.bundleFile(stylesheetFile);
            } else {
              stylesheetResult = await stylesheetBundler.bundleInline(
                data,
                containingFile,
                // Inline stylesheets from a template style element are always CSS; Otherwise, use default.
                containingFile.endsWith('.html') ? 'css' : undefined,
                // When external runtime styles are enabled, an identifier for the style that does not change
                // based on the content is required to avoid emitted JS code changes. Any JS code changes will
                // invalid the output and force a full page reload for HMR cases. The containing file and order
                // of the style within the containing file is used.
                pluginOptions.externalRuntimeStyles
                  ? createHash('sha256')
                      .update(containingFile)
                      .update((order ?? 0).toString())
                      .update(className ?? '')
                      .digest('hex')
                  : undefined,
              );
              // Adjust result source for inline styles.
              // There may be multiple inline styles with the same containing file and to ensure that the results
              // do not overwrite each other the result source identifier needs to be unique for each. The class
              // name and order fields can be used for this. The structure is arbitrary as long as it is unique.
              resultSource += `?class=${className}&order=${order}`;
            }

            (result.warnings ??= []).push(...stylesheetResult.warnings);
            if (stylesheetResult.errors) {
              (result.errors ??= []).push(...stylesheetResult.errors);

              const { referencedFiles } = stylesheetResult;
              if (referencedFiles) {
                referencedFileTracker.add(containingFile, referencedFiles);
                if (stylesheetFile) {
                  referencedFileTracker.add(stylesheetFile, referencedFiles);
                }
              }

              return '';
            }

            const { contents, outputFiles, metafile, referencedFiles } = stylesheetResult;

            additionalResults.set(resultSource, {
              outputFiles,
              metafile,
            });

            if (referencedFiles) {
              referencedFileTracker.add(containingFile, referencedFiles);
              if (stylesheetFile) {
                // Angular AOT compiler needs modified direct resource files to correctly invalidate its analysis
                referencedFileTracker.add(stylesheetFile, referencedFiles);
              }
            }

            return contents;
          },
          processWebWorker(workerFile, containingFile) {
            const fullWorkerPath = path.join(path.dirname(containingFile), workerFile);
            // The synchronous API must be used due to the TypeScript compilation currently being
            // fully synchronous and this process callback being called from within a TypeScript
            // transformer.
            const workerResult = bundleWebWorker(build, pluginOptions, fullWorkerPath);

            (result.warnings ??= []).push(...workerResult.warnings);
            if (workerResult.errors.length > 0) {
              (result.errors ??= []).push(...workerResult.errors);
              // Track worker file errors to allow rebuilds on changes
              referencedFileTracker.add(
                containingFile,
                workerResult.errors
                  .map((error) => error.location?.file)
                  .filter((file): file is string => !!file)
                  .map((file) => path.join(build.initialOptions.absWorkingDir ?? '', file)),
              );
              additionalResults.set(fullWorkerPath, { errors: result.errors });

              // Return the original path if the build failed
              return workerFile;
            }

            assert('outputFiles' in workerResult, 'Invalid web worker bundle result.');
            additionalResults.set(fullWorkerPath, {
              outputFiles: workerResult.outputFiles,
              metafile: workerResult.metafile,
            });

            const metafileInputPaths = Object.keys(workerResult.metafile.inputs)
              // When file replacements are used, the worker entry is passed via stdin and
              // esbuild reports it as "<stdin>" in the metafile. Exclude this virtual entry
              // since it does not correspond to a real file path.
              .filter((input) => input !== '<stdin>')
              .map((input) => path.join(build.initialOptions.absWorkingDir ?? '', input));

            // Always ensure the actual worker entry file is tracked as a dependency even when
            // the build used stdin (e.g. due to file replacements). This guarantees rebuilds
            // are triggered when the source worker file changes.
            if (!metafileInputPaths.includes(fullWorkerPath)) {
              metafileInputPaths.push(fullWorkerPath);
            }

            referencedFileTracker.add(containingFile, metafileInputPaths);

            // Return bundled worker file entry name to be used in the built output
            const workerCodeFile = workerResult.outputFiles.find((file) =>
              /^worker-[A-Z0-9]{8}.[cm]?js$/.test(path.basename(file.path)),
            );
            assert(workerCodeFile, 'Web Worker bundled code file should always be present.');
            const workerCodePath = path.relative(
              build.initialOptions.outdir ?? '',
              workerCodeFile.path,
            );

            return workerCodePath.replaceAll('\\', '/');
          },
        };

        // Initialize the Angular compilation for the current build.
        // In watch mode, previous build state will be reused.
        let referencedFiles;
        let externalStylesheets;
        try {
          const initializationResult = await compilation.initialize(
            pluginOptions.tsconfig,
            hostOptions,
            createCompilerOptionsTransformer(
              setupWarnings,
              pluginOptions,
              preserveSymlinks,
              build.initialOptions.conditions,
            ),
          );
          shouldTsIgnoreJs = !initializationResult.compilerOptions.allowJs;
          // Isolated modules option ensures safe non-TypeScript transpilation.
          // Typescript printing support for sourcemaps is not yet integrated.
          useTypeScriptTranspilation =
            !initializationResult.compilerOptions.isolatedModules ||
            !!initializationResult.compilerOptions.sourceMap ||
            !!initializationResult.compilerOptions.inlineSourceMap;
          referencedFiles = initializationResult.referencedFiles;
          externalStylesheets = initializationResult.externalStylesheets;
          if (initializationResult.templateUpdates) {
            // Propagate any template updates
            initializationResult.templateUpdates.forEach((value, key) =>
              pluginOptions.templateUpdates?.set(key, value),
            );
          }
        } catch (error) {
          (result.errors ??= []).push({
            text: 'Angular compilation initialization failed.',
            location: null,
            notes: [
              {
                text: error instanceof Error ? (error.stack ?? error.message) : `${error}`,
                location: null,
              },
            ],
          });

          // Initialization failure prevents further compilation steps
          hasCompilationErrors = true;

          return result;
        }

        if (compilation instanceof NoopCompilation) {
          hasCompilationErrors = await sharedTSCompilationState.waitUntilReady;

          return result;
        }

        if (externalStylesheets) {
          // Process any new external stylesheets
          for (const [stylesheetFile, externalId] of externalStylesheets) {
            await bundleExternalStylesheet(
              stylesheetBundler,
              stylesheetFile,
              externalId,
              result,
              additionalResults,
            );
          }
        }

        // Update TypeScript file output cache for all affected files
        try {
          await profileAsync('NG_EMIT_TS', async () => {
            for (const { filename, contents } of await compilation.emitAffectedFiles()) {
              typeScriptFileCache.set(path.normalize(filename), contents);
            }
          });
        } catch (error) {
          (result.errors ??= []).push({
            text: 'Angular compilation emit failed.',
            location: null,
            notes: [
              {
                text: error instanceof Error ? (error.stack ?? error.message) : `${error}`,
                location: null,
              },
            ],
          });
        }

        const diagnostics = await compilation.diagnoseFiles(
          useTypeChecking ? DiagnosticModes.All : DiagnosticModes.All & ~DiagnosticModes.Semantic,
        );
        if (diagnostics.errors?.length) {
          (result.errors ??= []).push(...diagnostics.errors);
        }
        if (diagnostics.warnings?.length) {
          (result.warnings ??= []).push(...diagnostics.warnings);
        }

        // Add errors from failed additional results.
        // This must be done after emit to capture latest web worker results.
        for (const { errors } of additionalResults.values()) {
          if (errors) {
            (result.errors ??= []).push(...errors);
          }
        }

        // Store referenced files for updated file watching if enabled
        if (pluginOptions.sourceFileCache) {
          pluginOptions.sourceFileCache.referencedFiles = [
            ...referencedFiles,
            ...referencedFileTracker.referencedFiles,
          ];
        }

        hasCompilationErrors = !!result.errors?.length;

        // Reset the setup warnings so that they are only shown during the first build.
        setupWarnings = undefined;

        sharedTSCompilationState.markAsReady(hasCompilationErrors);

        return result;
      });

      build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
        const request = rewriteForBazel(
          path.normalize(pluginOptions.fileReplacements?.[path.normalize(args.path)] ?? args.path),
        );
        const isJS = /\.[cm]?js$/.test(request);

        // Skip TS load attempt if JS TypeScript compilation not enabled and file is JS
        if (shouldTsIgnoreJs && isJS) {
          return undefined;
        }

        // The filename is currently used as a cache key. Since the cache is memory only,
        // the options cannot change and do not need to be represented in the key. If the
        // cache is later stored to disk, then the options that affect transform output
        // would need to be added to the key as well as a check for any change of content.
        let contents = typeScriptFileCache.get(request);

        if (contents === undefined) {
          // If the Angular compilation had errors the file may not have been emitted.
          // To avoid additional errors about missing files, return empty contents.
          if (hasCompilationErrors) {
            return { contents: '', loader: 'js' };
          }

          // No TS result indicates the file is not part of the TypeScript program.
          // If allowJs is enabled and the file is JS then defer to the next load hook.
          if (!shouldTsIgnoreJs && isJS) {
            return undefined;
          }

          const diangosticRoot = build.initialOptions.absWorkingDir ?? '';

          // Evaluate whether the file requires the Angular compiler transpilation.
          // If not, issue a warning but allow bundler to process the file (no type-checking).
          const directContents = await readFile(request, 'utf-8');
          if (!requiresAngularCompiler(directContents)) {
            return {
              warnings: [createMissingFileDiagnostic(request, args.path, diangosticRoot, false)],
              contents,
              loader: 'ts',
              resolveDir: path.dirname(request),
            };
          }

          // Otherwise return an error
          return {
            errors: [createMissingFileDiagnostic(request, args.path, diangosticRoot, true)],
          };
        } else if (typeof contents === 'string' && (useTypeScriptTranspilation || isJS)) {
          // A string indicates untransformed output from the TS/NG compiler.
          // This step is unneeded when using esbuild transpilation.
          const sideEffects = await hasSideEffects(request);
          const instrumentForCoverage = pluginOptions.instrumentForCoverage?.(request);
          contents = await javascriptTransformer.transformData(
            request,
            contents,
            true /* skipLinker */,
            sideEffects,
            instrumentForCoverage,
          );

          // Store as the returned Uint8Array to allow caching the fully transformed code
          typeScriptFileCache.set(request, contents);
        }

        let loader: Loader;
        if (useTypeScriptTranspilation || isJS) {
          // TypeScript has transpiled to JS or is already JS
          loader = 'js';
        } else if (request.at(-1) === 'x') {
          // TSX and TS have different syntax rules. Only set if input is a TSX file.
          loader = 'tsx';
        } else {
          // Otherwise, directly bundle TS
          loader = 'ts';
        }

        return {
          contents,
          loader,
          resolveDir: path.dirname(request),
        };
      });

      build.onLoad(
        { filter: /\.[cm]?js$/ },
        createCachedLoad(pluginOptions.loadResultCache, async (args) => {
          let request = rewriteForBazel(args.path);
          if (pluginOptions.fileReplacements) {
            const replacement = pluginOptions.fileReplacements[path.normalize(args.path)];
            if (replacement) {
              request = path.normalize(replacement);
            }
          }

          return profileAsync(
            'NG_EMIT_JS*',
            async () => {
              const sideEffects = await hasSideEffects(request);
              const contents = await javascriptTransformer.transformFile(
                request,
                pluginOptions.jit,
                sideEffects,
              );

              return {
                contents,
                loader: 'js',
                resolveDir: path.dirname(request),
                watchFiles: request !== args.path ? [request] : undefined,
              };
            },
            true,
          );
        }),
      );

      // Add a load handler if there are file replacement option entries for JSON files
      if (
        pluginOptions.fileReplacements &&
        Object.keys(pluginOptions.fileReplacements).some((value) => value.endsWith('.json'))
      ) {
        build.onLoad(
          { filter: /\.json$/ },
          createCachedLoad(pluginOptions.loadResultCache, async (args) => {
            const replacement = pluginOptions.fileReplacements?.[path.normalize(args.path)];
            if (replacement) {
              return {
                contents: await import('node:fs/promises').then(({ readFile }) =>
                  readFile(path.normalize(replacement)),
                ),
                loader: 'json' as const,
                watchFiles: [replacement],
              };
            }

            // If no replacement defined, let esbuild handle it directly
            return null;
          }),
        );
      }

      // Setup bundling of component templates and stylesheets when in JIT mode
      if (pluginOptions.jit) {
        setupJitPluginCallbacks(
          build,
          stylesheetBundler,
          additionalResults,
          pluginOptions.loadResultCache,
        );
      }

      build.onEnd((result) => {
        // Ensure other compilations are unblocked if the main compilation throws during start
        sharedTSCompilationState?.markAsReady(hasCompilationErrors);

        for (const { outputFiles, metafile } of additionalResults.values()) {
          // Add any additional output files to the main output files
          if (outputFiles?.length) {
            result.outputFiles?.push(...outputFiles);
          }

          // Combine additional metafiles with main metafile
          if (result.metafile && metafile) {
            // Append the existing object, by appending to it we prevent unnecessary new objections creations with spread
            // mitigating significant performance overhead for large apps.
            // See: https://bugs.chromium.org/p/v8/issues/detail?id=11536
            Object.assign(result.metafile.inputs, metafile.inputs);
            Object.assign(result.metafile.outputs, metafile.outputs);
          }
        }

        logCumulativeDurations();
      });

      build.onDispose(() => {
        sharedTSCompilationState?.dispose();
        void compilation.close?.();
        void javascriptTransformer.close();
        void cacheStore?.close();
      });

      /**
       * Checks if the file has side-effects when `advancedOptimizations` is enabled.
       */
      async function hasSideEffects(path: string): Promise<boolean | undefined> {
        if (!pluginOptions.advancedOptimizations) {
          return undefined;
        }

        const { sideEffects } = await build.resolve(path, {
          kind: 'import-statement',
          resolveDir: build.initialOptions.absWorkingDir ?? '',
        });

        return sideEffects;
      }
    },
  };
}

async function bundleExternalStylesheet(
  stylesheetBundler: ComponentStylesheetBundler,
  stylesheetFile: string,
  externalId: string | boolean,
  result: OnStartResult,
  additionalResults: Map<
    string,
    { outputFiles?: OutputFile[]; metafile?: Metafile; errors?: PartialMessage[] }
  >,
) {
  const styleResult = await stylesheetBundler.bundleFile(stylesheetFile, externalId);

  (result.warnings ??= []).push(...styleResult.warnings);
  if (styleResult.errors) {
    (result.errors ??= []).push(...styleResult.errors);
  } else {
    const { outputFiles, metafile } = styleResult;
    // Clear inputs to prevent triggering a rebuild of the application code for component
    // stylesheet file only changes when the dev server enables the internal-only external
    // stylesheet option. This does not affect builds since only the dev server can enable
    // the internal option.
    metafile.inputs = {};
    additionalResults.set(stylesheetFile, {
      outputFiles,
      metafile,
    });
  }
}

function createCompilerOptionsTransformer(
  setupWarnings: PartialMessage[] | undefined,
  pluginOptions: CompilerPluginOptions,
  preserveSymlinks: boolean | undefined,
  customConditions: string[] | undefined,
): Parameters<AngularCompilation['initialize']>[2] {
  return (compilerOptions) => {
    // target of 9 is ES2022 (using the number avoids an expensive import of typescript just for an enum)
    if (compilerOptions.target === undefined || compilerOptions.target < 9 /** ES2022 */) {
      // If 'useDefineForClassFields' is already defined in the users project leave the value as is.
      // Otherwise fallback to false due to https://github.com/microsoft/TypeScript/issues/45995
      // which breaks the deprecated `@Effects` NGRX decorator and potentially other existing code as well.
      compilerOptions.target = 9 /** ES2022 */;
      compilerOptions.useDefineForClassFields ??= false;

      // Only add the warning on the initial build
      setupWarnings?.push({
        text:
          `TypeScript compiler options 'target' and 'useDefineForClassFields' are set to 'ES2022' and ` +
          `'false' respectively by the Angular CLI.`,
        location: { file: pluginOptions.tsconfig },
        notes: [
          {
            text:
              'To control ECMA version and features use the Browserslist configuration. ' +
              'For more information, see https://angular.dev/tools/cli/build#configuring-browser-compatibility',
          },
        ],
      });
    }

    if (compilerOptions.compilationMode === 'partial') {
      setupWarnings?.push({
        text: 'Angular partial compilation mode is not supported when building applications.',
        location: null,
        notes: [{ text: 'Full compilation mode will be used instead.' }],
      });
      compilerOptions.compilationMode = 'full';
    }

    // Enable incremental compilation by default if caching is enabled and incremental is not explicitly disabled
    if (
      compilerOptions.incremental !== false &&
      pluginOptions.sourceFileCache?.persistentCachePath
    ) {
      compilerOptions.incremental = true;
      // Set the build info file location to the configured cache directory
      compilerOptions.tsBuildInfoFile = path.join(
        pluginOptions.sourceFileCache?.persistentCachePath,
        '.tsbuildinfo',
      );
    } else {
      compilerOptions.incremental = false;
    }

    if (compilerOptions.module === undefined || compilerOptions.module < 5 /** ES2015 */) {
      compilerOptions.module = 7; /** ES2022 */
      setupWarnings?.push({
        text: `TypeScript compiler options 'module' values 'CommonJS', 'UMD', 'System' and 'AMD' are not supported.`,
        location: null,
        notes: [{ text: `The 'module' option will be set to 'ES2022' instead.` }],
      });
    }

    if (compilerOptions.isolatedModules && compilerOptions.emitDecoratorMetadata) {
      setupWarnings?.push({
        text: `TypeScript compiler option 'isolatedModules' may prevent the 'emitDecoratorMetadata' option from emitting all metadata.`,
        location: null,
        notes: [
          {
            text:
              `The 'emitDecoratorMetadata' option is not required by Angular` +
              'and can be removed if not explictly required by the project.',
          },
        ],
      });
    }

    // Synchronize custom resolve conditions.
    // Set if using the supported bundler resolution mode (bundler is the default in new projects)
    if (
      compilerOptions.moduleResolution === 100 /* ModuleResolutionKind.Bundler */ ||
      compilerOptions.module === 200 /** ModuleKind.Preserve */
    ) {
      compilerOptions.customConditions = customConditions;
    }

    return {
      ...compilerOptions,
      noEmitOnError: false,
      composite: false,
      inlineSources: !!pluginOptions.sourcemap,
      inlineSourceMap: !!pluginOptions.sourcemap,
      sourceMap: undefined,
      mapRoot: undefined,
      sourceRoot: undefined,
      preserveSymlinks,
      externalRuntimeStyles: pluginOptions.externalRuntimeStyles,
      _enableHmr: !!pluginOptions.templateUpdates,
      supportTestBed: !!pluginOptions.includeTestMetadata,
      supportJitMode: !!pluginOptions.includeTestMetadata,
    };
  };
}

/**
 * Rewrites static import/export specifiers in a TypeScript/JavaScript source file to apply
 * file replacements. For each relative or absolute specifier that resolves to a path present
 * in the `fileReplacements` map, the specifier is replaced with the corresponding replacement
 * path. This allows file replacements to be honoured inside web worker entry files, where the
 * esbuild synchronous API does not support plugins.
 *
 * @param contents Raw source text of the source file.
 * @param workerDir Absolute directory of the source file (used to resolve relative specifiers).
 * @param fileReplacements Map from original absolute path to replacement absolute path.
 * @returns The rewritten source text, or the original text if no replacements are needed.
 */
function applyFileReplacementsToContent(
  contents: string,
  workerDir: string,
  fileReplacements: Record<string, string>,
): string {
  // Extensions to try when resolving a specifier without an explicit extension.
  const candidateExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'];

  // Use a line-anchored regex with a callback to replace import/export specifiers in-place.
  // The pattern matches static import and export-from statements (including multiline forms)
  // and captures the specifier. `[\s\S]*?` is used instead of `.*?` so that multiline import
  // lists (common in TypeScript) are matched correctly.
  return contents.replace(
    /^(import|export)([\s\S]*?\s+from\s+|\s+)(['"])([^'"]+)\3/gm,
    (match, _keyword, _middle, quote, specifier) => {
      // Only process relative specifiers; bare package-name imports are not file-path replacements.
      if (!specifier.startsWith('.') && !path.isAbsolute(specifier)) {
        return match;
      }

      const resolvedBase = path.isAbsolute(specifier)
        ? specifier
        : path.join(workerDir, specifier);

      // First check if the specifier already includes an extension and resolves directly.
      let replacementPath: string | undefined = fileReplacements[path.normalize(resolvedBase)];

      if (!replacementPath) {
        // Try appending each supported extension to resolve extensionless specifiers.
        for (const ext of candidateExtensions) {
          replacementPath = fileReplacements[path.normalize(resolvedBase + ext)];
          if (replacementPath) {
            break;
          }
        }
      }

      if (!replacementPath) {
        return match;
      }

      const newSpecifier = replacementPath.replaceAll('\\', '/');

      // Use a callback to avoid special replacement patterns (e.g. `$&`, `$'`) being
      // interpreted when the replacement path happens to contain `$` characters.
      return match.replace(`${quote}${specifier}${quote}`, () => `${quote}${newSpecifier}${quote}`);
    },
  );
}

function bundleWebWorker(
  build: PluginBuild,
  pluginOptions: CompilerPluginOptions,
  workerFile: string,
) {
  try {
    // If file replacements are configured, apply them to the worker bundle so that the
    // synchronous esbuild build honours the same substitutions as the main application build.
    //
    // Because the esbuild synchronous API does not support plugins, file replacements are
    // applied via two complementary mechanisms:
    //
    // 1. `alias`: esbuild's built-in alias option intercepts every resolve call across the
    //    entire bundle graph — entry file and all transitive imports — and redirects any
    //    import whose specifier exactly matches an original path to the replacement path.
    //    This covers imports that use a path form identical to the fileReplacements key
    //    (e.g. TypeScript path-mapped or absolute imports).
    //
    // 2. stdin rewriting: for relative specifiers in the worker entry file (the most common
    //    case), `applyFileReplacementsToContent` resolves each specifier to an absolute path,
    //    looks it up in the fileReplacements map, and rewrites the source text before passing
    //    it to esbuild via stdin. The rewritten specifiers now point directly to the
    //    replacement files, so esbuild bundles them without needing further intervention.
    let entryPoints: string[] | undefined;
    let stdin: { contents: string; resolveDir: string; loader: Loader } | undefined;
    let alias: Record<string, string> | undefined;

    if (pluginOptions.fileReplacements) {
      // Pass all file replacements as esbuild aliases so that every import in the worker
      // bundle graph — not just the entry — is subject to replacement at resolve time.
      alias = Object.fromEntries(
        Object.entries(pluginOptions.fileReplacements).map(([original, replacement]) => [
          original.replaceAll('\\', '/'),
          replacement.replaceAll('\\', '/'),
        ]),
      );

      // Check whether the worker entry file itself is being replaced.
      const entryReplacement = pluginOptions.fileReplacements[path.normalize(workerFile)];
      const effectiveWorkerFile = entryReplacement ?? workerFile;

      // Rewrite relative import specifiers in the entry file that resolve to a replaced path.
      // This handles the common case where transitive-dependency imports inside the entry use
      // relative paths that esbuild alias (which matches raw specifier text) would not catch.
      const workerDir = path.dirname(effectiveWorkerFile);
      const originalContents = readFileSync(effectiveWorkerFile, 'utf-8');
      const rewrittenContents = applyFileReplacementsToContent(
        originalContents,
        workerDir,
        pluginOptions.fileReplacements,
      );

      if (rewrittenContents !== originalContents || entryReplacement) {
        // Use stdin to pass the rewritten content so that the correct bundle is produced.
        // Infer the esbuild loader from the effective worker file extension.
        const stdinLoader: Loader =
          path.extname(effectiveWorkerFile).toLowerCase() === '.tsx' ? 'tsx' : 'ts';
        stdin = { contents: rewrittenContents, resolveDir: workerDir, loader: stdinLoader };
      } else {
        entryPoints = [workerFile];
      }
    } else {
      entryPoints = [workerFile];
    }

    const result = build.esbuild.buildSync({
      ...build.initialOptions,
      platform: 'browser',
      write: false,
      bundle: true,
      metafile: true,
      format: 'esm',
      entryNames: 'worker-[hash]',
      entryPoints,
      stdin,
      alias,
      sourcemap: pluginOptions.sourcemap,
      // Zone.js is not used in Web workers so no need to disable
      supported: undefined,
      // Plugins are not supported in sync esbuild calls
      plugins: undefined,
    });

    return result;
  } catch (error) {
    if (error && typeof error === 'object' && 'errors' in error && 'warnings' in error) {
      return error as BuildFailure;
    }
    throw error;
  }
}

function createMissingFileDiagnostic(
  request: string,
  original: string,
  root: string,
  angular: boolean,
): PartialMessage {
  const relativeRequest = path.relative(root, request);
  const notes: PartialNote[] = [];

  if (angular) {
    notes.push({
      text:
        `Files containing Angular metadata ('@Component'/'@Directive'/etc.) must be part of the TypeScript compilation.` +
        ` You can ensure the file is part of the TypeScript program via the 'files' or 'include' property.`,
    });
  } else {
    notes.push({
      text:
        `The file will be bundled and included in the output but will not be type-checked at build time.` +
        ` To remove this message you can add the file to the TypeScript program via the 'files' or 'include' property.`,
    });
  }

  const relativeOriginal = path.relative(root, original);
  if (relativeRequest !== relativeOriginal) {
    notes.push({
      text: `File is requested from a file replacement of '${relativeOriginal}'.`,
    });
  }

  const diagnostic = {
    text: `File '${relativeRequest}' not found in TypeScript compilation.`,
    notes,
  };

  return diagnostic;
}

const POTENTIAL_METADATA_REGEX = /@angular\/core|@Component|@Directive|@Injectable|@Pipe|@NgModule/;

function requiresAngularCompiler(contents: string): boolean {
  return POTENTIAL_METADATA_REGEX.test(contents);
}
