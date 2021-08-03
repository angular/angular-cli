/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { EmittedFiles, WebpackLoggingCallback, runWebpack } from '@angular-devkit/build-webpack';
import { getSystemPath, json, logging, normalize, resolve } from '@angular-devkit/core';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, from } from 'rxjs';
import { concatMap, map, switchMap } from 'rxjs/operators';
import { ScriptTarget } from 'typescript';
import webpack from 'webpack';
import { ExecutionTransformer } from '../../transforms';
import {
  BuildBrowserFeatures,
  deleteOutputDir,
  normalizeAssetPatterns,
  normalizeOptimization,
  urlJoin,
} from '../../utils';
import { ThresholdSeverity, checkBudgets } from '../../utils/bundle-calculator';
import { colors } from '../../utils/color';
import { copyAssets } from '../../utils/copy-assets';
import { i18nInlineEmittedFiles } from '../../utils/i18n-inlining';
import { I18nOptions } from '../../utils/i18n-options';
import { FileInfo } from '../../utils/index-file/augment-index-html';
import {
  IndexHtmlGenerator,
  IndexHtmlTransform,
} from '../../utils/index-file/index-html-generator';
import { ensureOutputPaths } from '../../utils/output-paths';
import { generateEntryPoints } from '../../utils/package-chunk-sort';
import { readTsconfig } from '../../utils/read-tsconfig';
import { augmentAppWithServiceWorker } from '../../utils/service-worker';
import { Spinner } from '../../utils/spinner';
import { assertCompatibleAngularVersion } from '../../utils/version';
import {
  generateI18nBrowserWebpackConfigFromContext,
  getIndexInputFile,
  getIndexOutputFile,
} from '../../utils/webpack-browser-config';
import {
  getAnalyticsConfig,
  getBrowserConfig,
  getCommonConfig,
  getStatsConfig,
  getStylesConfig,
  getTypeScriptConfig,
  getWorkerConfig,
} from '../../webpack/configs';
import { markAsyncChunksNonInitial } from '../../webpack/utils/async-chunks';
import { normalizeExtraEntryPoints } from '../../webpack/utils/helpers';
import {
  statsErrorsToString,
  statsHasErrors,
  statsHasWarnings,
  statsWarningsToString,
  webpackStatsLogger,
} from '../../webpack/utils/stats';
import { Schema as BrowserBuilderSchema } from './schema';

/**
 * @experimental Direct usage of this type is considered experimental.
 */
export type BrowserBuilderOutput = json.JsonObject &
  BuilderOutput & {
    baseOutputPath: string;
    outputPaths: string[];
    /**
     * @deprecated in version 9. Use 'outputPaths' instead.
     */
    outputPath: string;
  };

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
      getBrowserConfig(wco),
      getStylesConfig(wco),
      getStatsConfig(wco),
      getAnalyticsConfig(wco, context),
      getTypeScriptConfig(wco),
      wco.buildOptions.webWorkerTsConfig ? getWorkerConfig(wco) : {},
    ]);

  // Validate asset option values if processed directly
  if (options.assets?.length && !adjustedOptions.assets?.length) {
    normalizeAssetPatterns(
      options.assets,
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
  const root = normalize(context.workspaceRoot);

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
      const sysProjectRoot = getSystemPath(
        resolve(
          normalize(context.workspaceRoot),
          normalize((projectMetadata.root as string) ?? ''),
        ),
      );

      const { options: compilerOptions } = readTsconfig(options.tsConfig, context.workspaceRoot);
      const target = compilerOptions.target || ScriptTarget.ES5;
      const buildBrowserFeatures = new BuildBrowserFeatures(sysProjectRoot);

      checkInternetExplorerSupport(buildBrowserFeatures.supportedBrowsers, context.logger);

      return {
        ...(await initialize(options, context, transforms.webpackConfiguration)),
        buildBrowserFeatures,
        target,
      };
    }),
    switchMap(
      // eslint-disable-next-line max-lines-per-function
      ({ config, projectRoot, projectSourceRoot, i18n, buildBrowserFeatures, target }) => {
        const normalizedOptimization = normalizeOptimization(options.optimization);

        return runWebpack(config, context, {
          webpackFactory: require('webpack') as typeof webpack,
          logging:
            transforms.logging ||
            ((stats, config) => {
              if (options.verbose) {
                context.logger.info(stats.toString(config.stats));
              }
            }),
        }).pipe(
          // eslint-disable-next-line max-lines-per-function
          concatMap(async (buildEvent) => {
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

              return { success };
            } else {
              outputPaths = ensureOutputPaths(baseOutputPath, i18n);

              let moduleFiles: EmittedFiles[] | undefined;

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
                  target <= ScriptTarget.ES5,
                  options.i18nMissingTranslation,
                );
                if (!success) {
                  return { success: false };
                }
              }

              // Check for budget errors and display them to the user.
              const budgets = options.budgets;
              if (budgets?.length) {
                const budgetFailures = checkBudgets(budgets, webpackStats);
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

                if (options.index) {
                  spinner.start('Generating index html...');

                  const entrypoints = generateEntryPoints({
                    scripts: options.scripts ?? [],
                    styles: options.styles ?? [],
                  });

                  const indexHtmlGenerator = new IndexHtmlGenerator({
                    indexPath: path.join(context.workspaceRoot, getIndexInputFile(options.index)),
                    entrypoints,
                    deployUrl: options.deployUrl,
                    sri: options.subresourceIntegrity,
                    optimization: normalizedOptimization,
                    crossOrigin: options.crossOrigin,
                    postTransform: transforms.indexHtml,
                  });

                  let hasErrors = false;
                  for (const [locale, outputPath] of outputPaths.entries()) {
                    try {
                      const { content, warnings, errors } = await indexHtmlGenerator.process({
                        baseHref: getLocaleBaseHref(i18n, locale) || options.baseHref,
                        // i18nLocale is used when Ivy is disabled
                        lang: locale || undefined,
                        outputPath,
                        files: mapEmittedFilesToFileInfo(emittedFiles),
                        noModuleFiles: [],
                        moduleFiles: mapEmittedFilesToFileInfo(moduleFiles),
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

                      const indexOutput = path.join(outputPath, getIndexOutputFile(options.index));
                      await fs.promises.mkdir(path.dirname(indexOutput), { recursive: true });
                      await fs.promises.writeFile(indexOutput, content);
                    } catch (error) {
                      spinner.fail('Index html generation failed.');

                      return { success: false, error: mapErrorToMessage(error) };
                    }
                  }

                  if (hasErrors) {
                    spinner.fail('Index html generation failed.');

                    return { success: false };
                  } else {
                    spinner.succeed('Index html generation complete.');
                  }
                }

                if (options.serviceWorker) {
                  spinner.start('Generating service worker...');
                  for (const [locale, outputPath] of outputPaths.entries()) {
                    try {
                      await augmentAppWithServiceWorker(
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
                  }

                  spinner.succeed('Service worker generation complete.');
                }
              }

              webpackStatsLogger(context.logger, webpackStats, config);

              return { success: buildSuccess };
            }
          }),
          map(
            (event) =>
              ({
                ...event,
                baseOutputPath,
                outputPath: baseOutputPath,
                outputPaths: (outputPaths && Array.from(outputPaths.values())) || [baseOutputPath],
              } as BrowserBuilderOutput),
          ),
        );
      },
    ),
  );

  function getLocaleBaseHref(i18n: I18nOptions, locale: string): string | undefined {
    if (i18n.locales[locale] && i18n.locales[locale]?.baseHref !== '') {
      return urlJoin(options.baseHref || '', i18n.locales[locale].baseHref ?? `/${locale}/`);
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

function checkInternetExplorerSupport(
  supportedBrowsers: string[],
  logger: logging.LoggerApi,
): void {
  const hasIE9 = supportedBrowsers.includes('ie 9');
  const hasIE10 = supportedBrowsers.includes('ie 10');
  const hasIE11 = supportedBrowsers.includes('ie 11');

  if (hasIE9 || hasIE10) {
    const browsers = (hasIE9 ? 'IE 9' + (hasIE10 ? ' & ' : '') : '') + (hasIE10 ? 'IE 10' : '');
    logger.warn(
      `Warning: Support was requested for ${browsers} in the project's browserslist configuration. ` +
        (hasIE9 && hasIE10 ? 'These browsers are' : 'This browser is') +
        ' no longer officially supported with Angular v11 and higher.' +
        '\nFor more information, see https://v10.angular.io/guide/deprecations#ie-9-10-and-mobile',
    );
  }

  if (hasIE11) {
    logger.warn(
      `Warning: Support was requested for IE 11 in the project's browserslist configuration. ` +
        'IE 11 support is deprecated since Angular v12.' +
        '\nFor more information, see https://angular.io/guide/browser-support',
    );
  }
}

export default createBuilder<json.JsonObject & BrowserBuilderSchema>(buildWebpackBrowser);
