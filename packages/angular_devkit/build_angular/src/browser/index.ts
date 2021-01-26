/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { EmittedFiles, WebpackLoggingCallback, runWebpack } from '@angular-devkit/build-webpack';
import { getSystemPath, json, normalize, resolve, tags, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, from } from 'rxjs';
import { concatMap, map, switchMap } from 'rxjs/operators';
import { ScriptTarget } from 'typescript';
import * as webpack from 'webpack';
import { ExecutionTransformer } from '../transforms';
import {
  BuildBrowserFeatures,
  deleteOutputDir,
  normalizeAssetPatterns,
  normalizeOptimization,
  normalizeSourceMaps,
  urlJoin,
} from '../utils';
import { BundleActionExecutor } from '../utils/action-executor';
import { WebpackConfigOptions } from '../utils/build-options';
import { ThresholdSeverity, checkBudgets } from '../utils/bundle-calculator';
import { findCachePath } from '../utils/cache-path';
import { colors } from '../utils/color';
import { copyAssets } from '../utils/copy-assets';
import { cachingDisabled } from '../utils/environment-options';
import { mkdir, writeFile } from '../utils/fs';
import { i18nInlineEmittedFiles } from '../utils/i18n-inlining';
import { I18nOptions } from '../utils/i18n-options';
import { FileInfo } from '../utils/index-file/augment-index-html';
import { IndexHtmlGenerator, IndexHtmlTransform } from '../utils/index-file/index-html-generator';
import { ensureOutputPaths } from '../utils/output-paths';
import { generateEntryPoints } from '../utils/package-chunk-sort';
import {
  InlineOptions,
  ProcessBundleFile,
  ProcessBundleOptions,
  ProcessBundleResult,
} from '../utils/process-bundle';
import { readTsconfig } from '../utils/read-tsconfig';
import { augmentAppWithServiceWorker } from '../utils/service-worker';
import { Spinner } from '../utils/spinner';
import { assertCompatibleAngularVersion } from '../utils/version';
import {
  generateI18nBrowserWebpackConfigFromContext,
  getIndexInputFile,
  getIndexOutputFile,
} from '../utils/webpack-browser-config';
import {
  getAotConfig,
  getBrowserConfig,
  getCommonConfig,
  getNonAotConfig,
  getStatsConfig,
  getStylesConfig,
  getWorkerConfig,
  normalizeExtraEntryPoints,
} from '../webpack/configs';
import { NgBuildAnalyticsPlugin } from '../webpack/plugins/analytics';
import { markAsyncChunksNonInitial } from '../webpack/utils/async-chunks';
import {
  BundleStats,
  ChunkType,
  generateBundleStats,
  statsErrorsToString,
  statsHasErrors,
  statsHasWarnings,
  statsWarningsToString,
  webpackStatsLogger,
} from '../webpack/utils/stats';
import { Schema as BrowserBuilderSchema } from './schema';

const cacheDownlevelPath = cachingDisabled ? undefined : findCachePath('angular-build-dl');

export type BrowserBuilderOutput = json.JsonObject &
  BuilderOutput & {
    baseOutputPath: string;
    outputPaths: string[];
    /**
     * @deprecated in version 9. Use 'outputPaths' instead.
     */
    outputPath: string;
  };

export function getAnalyticsConfig(
  wco: WebpackConfigOptions,
  context: BuilderContext,
): webpack.Configuration {
  if (context.analytics) {
    // If there's analytics, add our plugin. Otherwise no need to slow down the build.
    let category = 'build';
    if (context.builder) {
      // We already vetted that this is a "safe" package, otherwise the analytics would be noop.
      category =
        context.builder.builderName.split(':')[1] || context.builder.builderName || 'build';
    }

    // The category is the builder name if it's an angular builder.
    return {
      plugins: [new NgBuildAnalyticsPlugin(
        wco.projectRoot,
        context.analytics,
        category,
        !!wco.tsConfig.options.enableIvy,
      )],
    };
  }

  return {};
}

export function getCompilerConfig(wco: WebpackConfigOptions): webpack.Configuration {
  if (wco.buildOptions.main || wco.buildOptions.polyfills) {
    return wco.buildOptions.aot ? getAotConfig(wco) : getNonAotConfig(wco);
  }

  return {};
}

async function initialize(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  host: virtualFs.Host<fs.Stats>,
  differentialLoadingNeeded: boolean,
  webpackConfigurationTransform?: ExecutionTransformer<webpack.Configuration>,
): Promise<{
  config: webpack.Configuration;
  projectRoot: string;
  projectSourceRoot?: string;
  i18n: I18nOptions;
}> {
  const originalOutputPath = options.outputPath;

  // Assets are processed directly by the builder except when watching
  const adjustedOptions = options.watch ? options : { ...options, assets: [] };

  const {
    config,
    projectRoot,
    projectSourceRoot,
    i18n,
  } = await generateI18nBrowserWebpackConfigFromContext(
    adjustedOptions,
    context,
    wco => [
      getCommonConfig(wco),
      getBrowserConfig(wco),
      getStylesConfig(wco),
      getStatsConfig(wco),
      getAnalyticsConfig(wco, context),
      getCompilerConfig(wco),
      wco.buildOptions.webWorkerTsConfig ? getWorkerConfig(wco) : {},
    ],
    host,
    { differentialLoadingNeeded },
  );

  // Validate asset option values if processed directly
  if (options.assets?.length && !adjustedOptions.assets?.length) {
    normalizeAssetPatterns(
      options.assets,
      new virtualFs.SyncDelegateHost(host),
      normalize(context.workspaceRoot),
      normalize(projectRoot),
      projectSourceRoot === undefined ? undefined : normalize(projectSourceRoot),
    ).forEach(({ output }) => {
      if (output.startsWith('..')) {
        throw new Error('An asset cannot be written to a location outside of the output path.');
      }
    });
  }

  let transformedConfig;
  if (webpackConfigurationTransform) {
    transformedConfig = await webpackConfigurationTransform(config);
  }

  if (options.deleteOutputPath) {
    deleteOutputDir(context.workspaceRoot, originalOutputPath);
  }

  return { config: transformedConfig || config, projectRoot, projectSourceRoot, i18n };
}

// tslint:disable-next-line: no-big-function
export function buildWebpackBrowser(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
    logging?: WebpackLoggingCallback;
    indexHtml?: IndexHtmlTransform;
  } = {},
): Observable<BrowserBuilderOutput> {
  const host = new NodeJsSyncHost();
  const root = normalize(context.workspaceRoot);

  const projectName = context.target?.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const baseOutputPath = path.resolve(context.workspaceRoot, options.outputPath);
  let outputPaths: undefined | Map<string, string>;

  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot, context.logger);

  return from(context.getProjectMetadata(projectName))
    .pipe(
      switchMap(async projectMetadata => {
        const sysProjectRoot = getSystemPath(
          resolve(normalize(context.workspaceRoot),
            normalize((projectMetadata.root as string) ?? '')),
        );

        const { options: compilerOptions } = readTsconfig(options.tsConfig, context.workspaceRoot);
        const target = compilerOptions.target || ScriptTarget.ES5;
        const buildBrowserFeatures = new BuildBrowserFeatures(sysProjectRoot);
        const isDifferentialLoadingNeeded = buildBrowserFeatures.isDifferentialLoadingNeeded(target);

        if (target > ScriptTarget.ES2015 && isDifferentialLoadingNeeded) {
          context.logger.warn(tags.stripIndent`
          Warning: Using differential loading with targets ES5 and ES2016 or higher may
          cause problems. Browsers with support for ES2015 will load the ES2016+ scripts
          referenced with script[type="module"] but they may not support ES2016+ syntax.
        `);
        }

        const hasIE9 = buildBrowserFeatures.supportedBrowsers.includes('ie 9');
        const hasIE10 = buildBrowserFeatures.supportedBrowsers.includes('ie 10');
        if (hasIE9 || hasIE10) {
          const browsers =
            (hasIE9 ? 'IE 9' + (hasIE10 ? ' & ' : '') : '') + (hasIE10 ? 'IE 10' : '');
          context.logger.warn(
            `Warning: Support was requested for ${browsers} in the project's browserslist configuration. ` +
            (hasIE9 && hasIE10 ? 'These browsers are' : 'This browser is') +
            ' no longer officially supported with Angular v11 and higher.' +
            '\nFor additional information: https://v10.angular.io/guide/deprecations#ie-9-10-and-mobile',
          );
        }

        return {
          ...(await initialize(options, context, host, isDifferentialLoadingNeeded, transforms.webpackConfiguration)),
          buildBrowserFeatures,
          isDifferentialLoadingNeeded,
          target,
        };
      }),
      // tslint:disable-next-line: no-big-function
      switchMap(({ config, projectRoot, projectSourceRoot, i18n, buildBrowserFeatures, isDifferentialLoadingNeeded, target }) => {
        const normalizedOptimization = normalizeOptimization(options.optimization);

        return runWebpack(config, context, {
          webpackFactory: require('webpack') as typeof webpack,
          logging: transforms.logging || (
            (stats, config) => {
              if (options.verbose) {
                context.logger.info(stats.toString(config.stats));
              }
            }
          ),
        }).pipe(
          // tslint:disable-next-line: no-big-function
          concatMap(async buildEvent => {
            const spinner = new Spinner();
            spinner.enabled = options.progress !== false;

            const { webpackStats: webpackRawStats, success, emittedFiles = [] } = buildEvent;
            if (!webpackRawStats) {
              throw new Error('Webpack stats build result is required.');
            }

            // Fix incorrectly set `initial` value on chunks.
            const extraEntryPoints = [
              ...normalizeExtraEntryPoints(options.styles || [], 'styles'),
              ...normalizeExtraEntryPoints(options.scripts || [], 'scripts'),
            ];

            const webpackStats = {
              ...webpackRawStats,
              chunks: markAsyncChunksNonInitial(webpackRawStats, extraEntryPoints),
            };

            if (!success) {
              // If using bundle downleveling then there is only one build
              // If it fails show any diagnostic messages and bail
              if (statsHasWarnings(webpackStats)) {
                context.logger.warn(statsWarningsToString(webpackStats, { colors: true }));
              }
              if (statsHasErrors(webpackStats)) {
                context.logger.error(statsErrorsToString(webpackStats, { colors: true }));
              }

              return { success };
            } else {
              const bundleInfoStats: BundleStats[] = [];
              outputPaths = ensureOutputPaths(baseOutputPath, i18n);

              let noModuleFiles: EmittedFiles[] | undefined;
              let moduleFiles: EmittedFiles[] | undefined;
              let files: EmittedFiles[] | undefined;

              const scriptsEntryPointName = normalizeExtraEntryPoints(
                options.scripts || [],
                'scripts',
              ).map(x => x.bundleName);

              if (isDifferentialLoadingNeeded && options.watch) {
                moduleFiles = emittedFiles;
                files = moduleFiles.filter(
                  x => x.extension === '.css' || (x.name && scriptsEntryPointName.includes(x.name)),
                );
                if (i18n.shouldInline) {
                  const success = await i18nInlineEmittedFiles(
                    context,
                    emittedFiles,
                    i18n,
                    baseOutputPath,
                    Array.from(outputPaths.values()),
                    scriptsEntryPointName,
                    // tslint:disable-next-line: no-non-null-assertion
                    webpackStats.outputPath!,
                    target <= ScriptTarget.ES5,
                    options.i18nMissingTranslation,
                  );
                  if (!success) {
                    return { success: false };
                  }
                }
              } else if (isDifferentialLoadingNeeded) {
                moduleFiles = [];
                noModuleFiles = [];

                // Common options for all bundle process actions
                const sourceMapOptions = normalizeSourceMaps(options.sourceMap || false);
                const actionOptions: Partial<ProcessBundleOptions> = {
                  optimize: normalizedOptimization.scripts,
                  sourceMaps: sourceMapOptions.scripts,
                  hiddenSourceMaps: sourceMapOptions.hidden,
                  vendorSourceMaps: sourceMapOptions.vendor,
                  integrityAlgorithm: options.subresourceIntegrity ? 'sha384' : undefined,
                };

                let mainChunkId;
                const actions: ProcessBundleOptions[] = [];
                let workerReplacements: [string, string][] | undefined;
                const seen = new Set<string>();
                for (const file of emittedFiles) {
                  // Assets are not processed nor injected into the index
                  if (file.asset) {
                    // WorkerPlugin adds worker files to assets
                    if (file.file.endsWith('.worker.js')) {
                      if (!workerReplacements) {
                        workerReplacements = [];
                      }
                      workerReplacements.push([
                        file.file,
                        file.file.replace(/\-(es20\d{2}|esnext)/, '-es5'),
                      ]);
                    } else {
                      continue;
                    }
                  }

                  // Scripts and non-javascript files are not processed
                  if (
                    file.extension !== '.js' ||
                    (file.name && scriptsEntryPointName.includes(file.name))
                  ) {
                    if (files === undefined) {
                      files = [];
                    }
                    files.push(file);
                    continue;
                  }

                  // Ignore already processed files; emittedFiles can contain duplicates
                  if (seen.has(file.file)) {
                    continue;
                  }
                  seen.add(file.file);

                  if (file.name === 'vendor' || (!mainChunkId && file.name === 'main')) {
                    // tslint:disable-next-line: no-non-null-assertion
                    mainChunkId = file.id!.toString();
                  }

                  // All files at this point except ES5 polyfills are module scripts
                  const es5Polyfills = file.file.startsWith('polyfills-es5');
                  if (!es5Polyfills) {
                    moduleFiles.push(file);
                  }

                  // Retrieve the content/map for the file
                  // NOTE: Additional future optimizations will read directly from memory
                  // tslint:disable-next-line: no-non-null-assertion
                  let filename = path.join(webpackStats.outputPath!, file.file);
                  const code = fs.readFileSync(filename, 'utf8');
                  let map;
                  if (actionOptions.sourceMaps) {
                    try {
                      map = fs.readFileSync(filename + '.map', 'utf8');
                      if (es5Polyfills) {
                        fs.unlinkSync(filename + '.map');
                      }
                    } catch { }
                  }

                  if (es5Polyfills) {
                    fs.unlinkSync(filename);
                    filename = filename.replace(/\-es20\d{2}/, '');
                  }

                  const es2015Polyfills = file.file.startsWith('polyfills-es20');

                  // Record the bundle processing action
                  // The runtime chunk gets special processing for lazy loaded files
                  actions.push({
                    ...actionOptions,
                    filename,
                    code,
                    map,
                    // id is always present for non-assets
                    // tslint:disable-next-line: no-non-null-assertion
                    name: file.id!,
                    runtime: file.file.startsWith('runtime'),
                    ignoreOriginal: es5Polyfills,
                    optimizeOnly: es2015Polyfills,
                  });

                  // ES2015 polyfills are only optimized; optimization check was performed above
                  if (es2015Polyfills) {
                    continue;
                  }

                  // Add the newly created ES5 bundles to the index as nomodule scripts
                  const newFilename = es5Polyfills
                    ? file.file.replace(/\-es20\d{2}/, '')
                    : file.file.replace(/\-(es20\d{2}|esnext)/, '-es5');
                  noModuleFiles.push({ ...file, file: newFilename });
                }

                const processActions: typeof actions = [];
                let processRuntimeAction: ProcessBundleOptions | undefined;
                const processResults: ProcessBundleResult[] = [];
                for (const action of actions) {
                  // If SRI is enabled always process the runtime bundle
                  // Lazy route integrity values are stored in the runtime bundle
                  if (action.integrityAlgorithm && action.runtime) {
                    processRuntimeAction = action;
                  } else {
                    processActions.push({ replacements: workerReplacements, ...action });
                  }
                }

                const executor = new BundleActionExecutor(
                  { cachePath: cacheDownlevelPath, i18n },
                  options.subresourceIntegrity ? 'sha384' : undefined,
                );

                // Execute the bundle processing actions
                try {
                  spinner.start('Generating ES5 bundles for differential loading...');
                  for await (const result of executor.processAll(processActions)) {
                    processResults.push(result);
                  }

                  // Runtime must be processed after all other files
                  if (processRuntimeAction) {
                    const runtimeOptions = {
                      ...processRuntimeAction,
                      runtimeData: processResults,
                      supportedBrowsers: buildBrowserFeatures.supportedBrowsers,
                    };
                    processResults.push(
                      await import('../utils/process-bundle').then(m => m.process(runtimeOptions)),
                    );
                  }

                  spinner.succeed('ES5 bundle generation complete.');

                  if (i18n.shouldInline) {
                    spinner.start('Generating localized bundles...');
                    const inlineActions: InlineOptions[] = [];
                    const processedFiles = new Set<string>();
                    for (const result of processResults) {
                      if (result.original) {
                        inlineActions.push({
                          filename: path.basename(result.original.filename),
                          code: fs.readFileSync(result.original.filename, 'utf8'),
                          map:
                            result.original.map &&
                            fs.readFileSync(result.original.map.filename, 'utf8'),
                          outputPath: baseOutputPath,
                          es5: false,
                          missingTranslation: options.i18nMissingTranslation,
                          setLocale: result.name === mainChunkId,
                        });
                        processedFiles.add(result.original.filename);
                        if (result.original.map) {
                          processedFiles.add(result.original.map.filename);
                        }
                      }
                      if (result.downlevel) {
                        inlineActions.push({
                          filename: path.basename(result.downlevel.filename),
                          code: fs.readFileSync(result.downlevel.filename, 'utf8'),
                          map:
                            result.downlevel.map &&
                            fs.readFileSync(result.downlevel.map.filename, 'utf8'),
                          outputPath: baseOutputPath,
                          es5: true,
                          missingTranslation: options.i18nMissingTranslation,
                          setLocale: result.name === mainChunkId,
                        });
                        processedFiles.add(result.downlevel.filename);
                        if (result.downlevel.map) {
                          processedFiles.add(result.downlevel.map.filename);
                        }
                      }
                    }

                    let hasErrors = false;
                    try {
                      for await (const result of executor.inlineAll(inlineActions)) {
                        if (options.verbose) {
                          context.logger.info(
                            `Localized "${result.file}" [${result.count} translation(s)].`,
                          );
                        }
                        for (const diagnostic of result.diagnostics) {
                          spinner.stop();
                          if (diagnostic.type === 'error') {
                            hasErrors = true;
                            context.logger.error(diagnostic.message);
                          } else {
                            context.logger.warn(diagnostic.message);
                          }
                          spinner.start();
                        }
                      }

                      // Copy any non-processed files into the output locations
                      await copyAssets(
                        [
                          {
                            glob: '**/*',
                            // tslint:disable-next-line: no-non-null-assertion
                            input: webpackStats.outputPath!,
                            output: '',
                            ignore: [...processedFiles].map(f =>
                              // tslint:disable-next-line: no-non-null-assertion
                              path.relative(webpackStats.outputPath!, f),
                            ),
                          },
                        ],
                        Array.from(outputPaths.values()),
                        '',
                      );
                    } catch (err) {
                      spinner.fail('Localized bundle generation failed.');

                      return { success: false, error: mapErrorToMessage(err) };
                    }

                    if (hasErrors) {
                      spinner.fail('Localized bundle generation failed.');
                    } else {
                      spinner.succeed('Localized bundle generation complete.');
                    }

                    if (hasErrors) {
                      return { success: false };
                    }
                  }
                } finally {
                  executor.stop();
                }
                for (const result of processResults) {
                  const chunk = webpackStats.chunks?.find((chunk) => chunk.id.toString() === result.name);

                  if (result.original) {
                    bundleInfoStats.push(generateBundleInfoStats(result.original, chunk, 'modern'));
                  }

                  if (result.downlevel) {
                    bundleInfoStats.push(generateBundleInfoStats(result.downlevel, chunk, 'legacy'));
                  }
                }

                const unprocessedChunks = webpackStats.chunks?.filter((chunk) => !processResults
                  .find((result) => chunk.id.toString() === result.name),
                ) || [];
                for (const chunk of unprocessedChunks) {
                  const asset = webpackStats.assets?.find(a => a.name === chunk.files[0]);
                  bundleInfoStats.push(generateBundleStats({ ...chunk, size: asset?.size }));
                }

                // Check for budget errors and display them to the user.
                const budgets = options.budgets || [];
                const budgetFailures = checkBudgets(budgets, webpackStats, processResults);
                for (const { severity, message } of budgetFailures) {
                  switch (severity) {
                    case ThresholdSeverity.Warning:
                      webpackStats.warnings.push(message);
                      break;
                    case ThresholdSeverity.Error:
                      webpackStats.errors.push(message);
                      break;
                    default:
                      assertNever(severity);
                  }
                }
              } else {
                files = emittedFiles.filter(x => x.name !== 'polyfills-es5');
                noModuleFiles = emittedFiles.filter(x => x.name === 'polyfills-es5');
                if (i18n.shouldInline) {
                  const success = await i18nInlineEmittedFiles(
                    context,
                    emittedFiles,
                    i18n,
                    baseOutputPath,
                    Array.from(outputPaths.values()),
                    scriptsEntryPointName,
                    // tslint:disable-next-line: no-non-null-assertion
                    webpackStats.outputPath!,
                    target <= ScriptTarget.ES5,
                    options.i18nMissingTranslation,
                  );
                  if (!success) {
                    return { success: false };
                  }
                }
              }

              // Copy assets
              if (!options.watch && options.assets?.length) {
                spinner.start('Copying assets...');
                try {
                  await copyAssets(
                    normalizeAssetPatterns(
                      options.assets,
                      new virtualFs.SyncDelegateHost(host),
                      root,
                      normalize(projectRoot),
                      projectSourceRoot === undefined ? undefined : normalize(projectSourceRoot),
                    ),
                    Array.from(outputPaths.values()),
                    context.workspaceRoot,
                  );
                  spinner.succeed('Copying assets complete.');
                } catch (err) {
                  spinner.fail(colors.redBright('Copying of assets failed.'));

                  return { success: false, error: 'Unable to copy assets: ' + err.message };
                }
              }

              if (success) {
                if (options.index) {
                  spinner.start('Generating index html...');

                  const WOFFSupportNeeded = !buildBrowserFeatures.isFeatureSupported('woff2');
                  const entrypoints = generateEntryPoints({
                    scripts: options.scripts ?? [],
                    styles: options.styles ?? [],
                  });

                  const indexHtmlGenerator = new IndexHtmlGenerator({
                    indexPath: path.join(context.workspaceRoot, getIndexInputFile(options.index)),
                    entrypoints,
                    deployUrl: options.deployUrl,
                    sri: options.subresourceIntegrity,
                    WOFFSupportNeeded,
                    optimization: normalizedOptimization,
                    crossOrigin: options.crossOrigin,
                    postTransform: transforms.indexHtml,
                  });

                  for (const [locale, outputPath] of outputPaths.entries()) {
                    try {
                      const { content, warnings, errors } = await indexHtmlGenerator.process({
                        baseHref: getLocaleBaseHref(i18n, locale) || options.baseHref,
                        // i18nLocale is used when Ivy is disabled
                        lang: locale || options.i18nLocale,
                        outputPath,
                        files: mapEmittedFilesToFileInfo(files),
                        noModuleFiles: mapEmittedFilesToFileInfo(noModuleFiles),
                        moduleFiles: mapEmittedFilesToFileInfo(moduleFiles),
                      });

                      if (warnings.length || errors.length) {
                        spinner.stop();
                        warnings.forEach(m => context.logger.warn(m));
                        errors.forEach(m => context.logger.error(m));
                        spinner.start();
                      }

                      const indexOutput = path.join(outputPath, getIndexOutputFile(options.index));
                      await mkdir(path.dirname(indexOutput), { recursive: true });
                      await writeFile(indexOutput, content);
                    } catch (error) {
                      spinner.fail('Index html generation failed.');

                      return { success: false, error: mapErrorToMessage(error) };
                    }

                    spinner.succeed('Index html generation complete.');
                  }
                }

                if (options.serviceWorker) {
                  spinner.start('Generating service worker...');
                  for (const [locale, outputPath] of outputPaths.entries()) {
                    try {
                      await augmentAppWithServiceWorker(
                        host,
                        root,
                        normalize(projectRoot),
                        normalize(outputPath),
                        getLocaleBaseHref(i18n, locale) || options.baseHref || '/',
                        options.ngswConfigPath,
                      );
                    } catch (error) {
                      spinner.fail('Service worker generation failed.');

                      return { success: false, error: mapErrorToMessage(error) };
                    }

                    spinner.succeed('Service worker generation complete.');
                  }
                }
              }

              webpackStatsLogger(context.logger, webpackStats, config, bundleInfoStats);

              return { success: !statsHasErrors(webpackStats) };
            }
          }),
          map(
            event =>
              ({
                ...event,
                baseOutputPath,
                outputPath: baseOutputPath,
                outputPaths: outputPaths && Array.from(outputPaths.values()) || [baseOutputPath],
              } as BrowserBuilderOutput),
          ),
        );
      }),
    );

  function getLocaleBaseHref(i18n: I18nOptions, locale: string): string | undefined {
    if (i18n.locales[locale] && i18n.locales[locale]?.baseHref !== '') {
      return urlJoin(
        options.baseHref || '',
        i18n.locales[locale].baseHref ?? `/${locale}/`,
      );
    }

    return undefined;
  }
}

function mapErrorToMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return undefined;
}

function assertNever(input: never): never {
  throw new Error(`Unexpected call to assertNever() with input: ${JSON.stringify(input, null /* replacer */, 4 /* tabSize */)}`);
}

type ArrayElement<A> = A extends ReadonlyArray<infer T> ? T : never;
function generateBundleInfoStats(
  bundle: ProcessBundleFile,
  chunk: ArrayElement<webpack.Stats.ToJsonOutput['chunks']> | undefined,
  chunkType: ChunkType,
): BundleStats {
  return generateBundleStats(
    {
      size: bundle.size,
      files: bundle.map ? [bundle.filename, bundle.map.filename] : [bundle.filename],
      names: chunk?.names,
      entry: !!chunk?.names.includes('runtime'),
      initial: !!chunk?.initial,
      rendered: true,
      chunkType,
    },
  );
}

function mapEmittedFilesToFileInfo(files: EmittedFiles[] = []): FileInfo[] {
  const filteredFiles: FileInfo[] = [];
  for (const { file, name, extension, initial } of files) {
    if (name && initial) {
      filteredFiles.push({ file, extension, name });
    }
  }

  return filteredFiles;
}

export default createBuilder<json.JsonObject & BrowserBuilderSchema>(buildWebpackBrowser);
