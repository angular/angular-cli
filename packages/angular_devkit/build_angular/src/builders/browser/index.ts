/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  BudgetCalculatorResult,
  FileInfo,
  IndexHtmlGenerator,
  IndexHtmlTransform,
  ThresholdSeverity,
  assertCompatibleAngularVersion,
  augmentAppWithServiceWorker,
  checkBudgets,
  purgeStaleBuildCache,
} from '@angular/build/private';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { EmittedFiles, WebpackLoggingCallback, runWebpack } from '@angular-devkit/build-webpack';
import { imageDomains } from '@ngtools/webpack';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, concatMap, from, map, switchMap } from 'rxjs';
import webpack, { StatsCompilation } from 'webpack';
import { getCommonConfig, getStylesConfig } from '../../tools/webpack/configs';
import { markAsyncChunksNonInitial } from '../../tools/webpack/utils/async-chunks';
import { normalizeExtraEntryPoints } from '../../tools/webpack/utils/helpers';
import {
  BuildEventStats,
  generateBuildEventStats,
  statsErrorsToString,
  statsHasErrors,
  statsHasWarnings,
  statsWarningsToString,
  webpackStatsLogger,
} from '../../tools/webpack/utils/stats';
import { ExecutionTransformer } from '../../transforms';
import {
  deleteOutputDir,
  normalizeAssetPatterns,
  normalizeOptimization,
  urlJoin,
} from '../../utils';
import { colors } from '../../utils/color';
import { copyAssets } from '../../utils/copy-assets';
import { assertIsError } from '../../utils/error';
import { i18nInlineEmittedFiles } from '../../utils/i18n-inlining';
import { I18nOptions } from '../../utils/i18n-webpack';
import { normalizeCacheOptions } from '../../utils/normalize-cache';
import { ensureOutputPaths } from '../../utils/output-paths';
import { generateEntryPoints } from '../../utils/package-chunk-sort';
import { Spinner } from '../../utils/spinner';
import {
  generateI18nBrowserWebpackConfigFromContext,
  getIndexInputFile,
  getIndexOutputFile,
} from '../../utils/webpack-browser-config';
import { Schema as BrowserBuilderSchema } from './schema';

/**
 * @experimental Direct usage of this type is considered experimental.
 */
export type BrowserBuilderOutput = BuilderOutput & {
  stats: BuildEventStats;
  baseOutputPath: string;
  outputs: {
    locale?: string;
    path: string;
    baseHref?: string;
  }[];
};

/**
 * Maximum time in milliseconds for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

async function initialize(
  options: BrowserBuilderSchema,
  context: BuilderContext,
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

  const { config, projectRoot, projectSourceRoot, i18n } =
    await generateI18nBrowserWebpackConfigFromContext(adjustedOptions, context, (wco) => [
      getCommonConfig(wco),
      getStylesConfig(wco),
    ]);

  let transformedConfig;
  if (webpackConfigurationTransform) {
    transformedConfig = await webpackConfigurationTransform(config);
  }

  if (options.deleteOutputPath) {
    await deleteOutputDir(context.workspaceRoot, originalOutputPath);
  }

  return { config: transformedConfig || config, projectRoot, projectSourceRoot, i18n };
}

/**
 * @experimental Direct usage of this function is considered experimental.
 */
// eslint-disable-next-line max-lines-per-function
export function buildWebpackBrowser(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
    logging?: WebpackLoggingCallback;
    indexHtml?: IndexHtmlTransform;
  } = {},
): Observable<BrowserBuilderOutput> {
  const projectName = context.target?.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const baseOutputPath = path.resolve(context.workspaceRoot, options.outputPath);
  let outputPaths: undefined | Map<string, string>;

  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot);

  return from(context.getProjectMetadata(projectName)).pipe(
    switchMap(async (projectMetadata) => {
      // Purge old build disk cache.
      await purgeStaleBuildCache(context);

      // Initialize builder
      const initialization = await initialize(options, context, transforms.webpackConfiguration);

      // Add index file to watched files.
      if (options.watch) {
        const indexInputFile = path.join(context.workspaceRoot, getIndexInputFile(options.index));
        initialization.config.plugins ??= [];
        initialization.config.plugins.push({
          apply: (compiler: webpack.Compiler) => {
            compiler.hooks.thisCompilation.tap('build-angular', (compilation) => {
              compilation.fileDependencies.add(indexInputFile);
            });
          },
        });
      }

      return {
        ...initialization,
        cacheOptions: normalizeCacheOptions(projectMetadata, context.workspaceRoot),
      };
    }),
    switchMap(
      // eslint-disable-next-line max-lines-per-function
      ({ config, projectRoot, projectSourceRoot, i18n, cacheOptions }) => {
        const normalizedOptimization = normalizeOptimization(options.optimization);

        return runWebpack(config, context, {
          webpackFactory: require('webpack') as typeof webpack,
          logging:
            transforms.logging ||
            ((stats, config) => {
              if (options.verbose && config.stats !== false) {
                const statsOptions = config.stats === true ? undefined : config.stats;
                context.logger.info(stats.toString(statsOptions));
              }
            }),
        }).pipe(
          concatMap(
            // eslint-disable-next-line max-lines-per-function
            async (
              buildEvent,
            ): Promise<{ output: BuilderOutput; webpackStats: StatsCompilation }> => {
              const spinner = new Spinner();
              spinner.enabled = options.progress !== false;

              const { success, emittedFiles = [], outputPath: webpackOutputPath } = buildEvent;
              const webpackRawStats = buildEvent.webpackStats;
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

                return {
                  webpackStats: webpackRawStats,
                  output: { success: false },
                };
              } else {
                outputPaths = ensureOutputPaths(baseOutputPath, i18n);

                const scriptsEntryPointName = normalizeExtraEntryPoints(
                  options.scripts || [],
                  'scripts',
                ).map((x) => x.bundleName);

                if (i18n.shouldInline) {
                  const success = await i18nInlineEmittedFiles(
                    context,
                    emittedFiles,
                    i18n,
                    baseOutputPath,
                    Array.from(outputPaths.values()),
                    scriptsEntryPointName,
                    webpackOutputPath,
                    options.i18nMissingTranslation,
                  );
                  if (!success) {
                    return {
                      webpackStats: webpackRawStats,
                      output: { success: false },
                    };
                  }
                }

                // Check for budget errors and display them to the user.
                const budgets = options.budgets;
                let budgetFailures: BudgetCalculatorResult[] | undefined;
                if (budgets?.length) {
                  budgetFailures = [...checkBudgets(budgets, webpackStats)];
                  for (const { severity, message } of budgetFailures) {
                    switch (severity) {
                      case ThresholdSeverity.Warning:
                        webpackStats.warnings?.push({ message });
                        break;
                      case ThresholdSeverity.Error:
                        webpackStats.errors?.push({ message });
                        break;
                      default:
                        assertNever(severity);
                    }
                  }
                }

                const buildSuccess = success && !statsHasErrors(webpackStats);
                if (buildSuccess) {
                  // Copy assets
                  if (!options.watch && options.assets?.length) {
                    spinner.start('Copying assets...');
                    try {
                      await copyAssets(
                        normalizeAssetPatterns(
                          options.assets,
                          context.workspaceRoot,
                          projectRoot,
                          projectSourceRoot,
                        ),
                        Array.from(outputPaths.values()),
                        context.workspaceRoot,
                      );
                      spinner.succeed('Copying assets complete.');
                    } catch (err) {
                      spinner.fail(colors.redBright('Copying of assets failed.'));
                      assertIsError(err);

                      return {
                        output: {
                          success: false,
                          error: 'Unable to copy assets: ' + err.message,
                        },
                        webpackStats: webpackRawStats,
                      };
                    }
                  }

                  if (options.index) {
                    spinner.start('Generating index html...');

                    const entrypoints = generateEntryPoints({
                      scripts: options.scripts ?? [],
                      styles: options.styles ?? [],
                    });

                    const indexHtmlGenerator = new IndexHtmlGenerator({
                      cache: cacheOptions,
                      indexPath: path.join(context.workspaceRoot, getIndexInputFile(options.index)),
                      entrypoints,
                      deployUrl: options.deployUrl,
                      sri: options.subresourceIntegrity,
                      optimization: normalizedOptimization,
                      crossOrigin: options.crossOrigin,
                      postTransform: transforms.indexHtml,
                      imageDomains: Array.from(imageDomains),
                    });

                    let hasErrors = false;
                    for (const [locale, outputPath] of outputPaths.entries()) {
                      try {
                        const {
                          csrContent: content,
                          warnings,
                          errors,
                        } = await indexHtmlGenerator.process({
                          baseHref: getLocaleBaseHref(i18n, locale) ?? options.baseHref,
                          // i18nLocale is used when Ivy is disabled
                          lang: locale || undefined,
                          outputPath,
                          files: mapEmittedFilesToFileInfo(emittedFiles),
                        });

                        if (warnings.length || errors.length) {
                          spinner.stop();
                          warnings.forEach((m) => context.logger.warn(m));
                          errors.forEach((m) => {
                            context.logger.error(m);
                            hasErrors = true;
                          });
                          spinner.start();
                        }

                        const indexOutput = path.join(
                          outputPath,
                          getIndexOutputFile(options.index),
                        );
                        await fs.promises.mkdir(path.dirname(indexOutput), { recursive: true });
                        await fs.promises.writeFile(indexOutput, content);
                      } catch (error) {
                        spinner.fail('Index html generation failed.');
                        assertIsError(error);

                        return {
                          webpackStats: webpackRawStats,
                          output: { success: false, error: error.message },
                        };
                      }
                    }

                    if (hasErrors) {
                      spinner.fail('Index html generation failed.');

                      return {
                        webpackStats: webpackRawStats,
                        output: { success: false },
                      };
                    } else {
                      spinner.succeed('Index html generation complete.');
                    }
                  }

                  if (options.serviceWorker) {
                    spinner.start('Generating service worker...');
                    for (const [locale, outputPath] of outputPaths.entries()) {
                      try {
                        await augmentAppWithServiceWorker(
                          projectRoot,
                          context.workspaceRoot,
                          outputPath,
                          getLocaleBaseHref(i18n, locale) ?? options.baseHref ?? '/',
                          options.ngswConfigPath,
                        );
                      } catch (error) {
                        spinner.fail('Service worker generation failed.');
                        assertIsError(error);

                        return {
                          webpackStats: webpackRawStats,
                          output: { success: false, error: error.message },
                        };
                      }
                    }

                    spinner.succeed('Service worker generation complete.');
                  }
                }

                webpackStatsLogger(context.logger, webpackStats, config, budgetFailures);

                return {
                  webpackStats: webpackRawStats,
                  output: { success: buildSuccess },
                };
              }
            },
          ),
          map(
            ({ output: event, webpackStats }) =>
              ({
                ...event,
                stats: generateBuildEventStats(webpackStats, options),
                baseOutputPath,
                outputs: (outputPaths &&
                  [...outputPaths.entries()].map(([locale, path]) => ({
                    locale,
                    path,
                    baseHref: getLocaleBaseHref(i18n, locale) ?? options.baseHref,
                  }))) || {
                  path: baseOutputPath,
                  baseHref: options.baseHref,
                },
              }) as BrowserBuilderOutput,
          ),
        );
      },
    ),
  );

  function getLocaleBaseHref(i18n: I18nOptions, locale: string): string | undefined {
    if (i18n.flatOutput) {
      return undefined;
    }

    const localeData = i18n.locales[locale];
    if (!localeData) {
      return undefined;
    }

    const baseHrefSuffix = localeData.baseHref ?? localeData.subPath + '/';

    return baseHrefSuffix !== '' ? urlJoin(options.baseHref || '', baseHrefSuffix) : undefined;
  }
}

function assertNever(input: never): never {
  throw new Error(
    `Unexpected call to assertNever() with input: ${JSON.stringify(
      input,
      null /* replacer */,
      4 /* tabSize */,
    )}`,
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

export default createBuilder<BrowserBuilderSchema>(buildWebpackBrowser);
