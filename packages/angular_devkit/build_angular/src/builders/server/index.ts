/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { assertCompatibleAngularVersion, purgeStaleBuildCache } from '@angular/build/private';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { runWebpack } from '@angular-devkit/build-webpack';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { Observable, concatMap, from } from 'rxjs';
import webpack, { Configuration } from 'webpack';
import { getCommonConfig, getStylesConfig } from '../../tools/webpack/configs';
import { isPackageInstalled } from '../../tools/webpack/utils/helpers';
import {
  statsErrorsToString,
  statsHasErrors,
  statsHasWarnings,
  statsWarningsToString,
  webpackStatsLogger,
} from '../../tools/webpack/utils/stats';
import { ExecutionTransformer } from '../../transforms';
import {
  NormalizedBrowserBuilderSchema,
  deleteOutputDir,
  normalizeAssetPatterns,
} from '../../utils';
import { colors } from '../../utils/color';
import { copyAssets } from '../../utils/copy-assets';
import { assertIsError } from '../../utils/error';
import { i18nInlineEmittedFiles } from '../../utils/i18n-inlining';
import { I18nOptions } from '../../utils/i18n-webpack';
import { ensureOutputPaths } from '../../utils/output-paths';
import { Spinner } from '../../utils/spinner';
import {
  BrowserWebpackConfigOptions,
  generateI18nBrowserWebpackConfigFromContext,
} from '../../utils/webpack-browser-config';
import { Schema as ServerBuilderOptions } from './schema';

/**
 * @experimental Direct usage of this type is considered experimental.
 */
export type ServerBuilderOutput = BuilderOutput & {
  baseOutputPath: string;
  outputPath: string;
  outputs: {
    locale?: string;
    path: string;
  }[];
};

export type { ServerBuilderOptions };

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export function execute(
  options: ServerBuilderOptions,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
  } = {},
): Observable<ServerBuilderOutput> {
  const root = context.workspaceRoot;

  // Check Angular version.
  assertCompatibleAngularVersion(root);

  const baseOutputPath = path.resolve(root, options.outputPath);
  let outputPaths: undefined | Map<string, string>;

  return from(initialize(options, context, transforms.webpackConfiguration)).pipe(
    concatMap(({ config, i18n, projectRoot, projectSourceRoot }) => {
      return runWebpack(config, context, {
        webpackFactory: require('webpack') as typeof webpack,
        logging: (stats, config) => {
          if (options.verbose && config.stats !== false) {
            const statsOptions = config.stats === true ? undefined : config.stats;
            context.logger.info(stats.toString(statsOptions));
          }
        },
      }).pipe(
        concatMap(async (output) => {
          const { emittedFiles = [], outputPath, webpackStats, success } = output;
          if (!webpackStats) {
            throw new Error('Webpack stats build result is required.');
          }

          if (!success) {
            if (statsHasWarnings(webpackStats)) {
              context.logger.warn(statsWarningsToString(webpackStats, { colors: true }));
            }
            if (statsHasErrors(webpackStats)) {
              context.logger.error(statsErrorsToString(webpackStats, { colors: true }));
            }

            return output;
          }

          const spinner = new Spinner();
          spinner.enabled = options.progress !== false;
          outputPaths = ensureOutputPaths(baseOutputPath, i18n);

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
                ...output,
                success: false,
                error: 'Unable to copy assets: ' + err.message,
              };
            }
          }

          if (i18n.shouldInline) {
            const success = await i18nInlineEmittedFiles(
              context,
              emittedFiles,
              i18n,
              baseOutputPath,
              Array.from(outputPaths.values()),
              [],
              outputPath,
              options.i18nMissingTranslation,
            );
            if (!success) {
              return {
                ...output,
                success: false,
              };
            }
          }

          webpackStatsLogger(context.logger, webpackStats, config);

          return output;
        }),
      );
    }),
    concatMap(async (output) => {
      if (!output.success) {
        return output as ServerBuilderOutput;
      }

      return {
        ...output,
        baseOutputPath,
        outputs: (outputPaths &&
          [...outputPaths.entries()].map(([locale, path]) => ({
            locale,
            path,
          }))) || {
          path: baseOutputPath,
        },
      } as ServerBuilderOutput;
    }),
  );
}

export default createBuilder<ServerBuilderOptions, ServerBuilderOutput>(execute);

async function initialize(
  options: ServerBuilderOptions,
  context: BuilderContext,
  webpackConfigurationTransform?: ExecutionTransformer<webpack.Configuration>,
): Promise<{
  config: webpack.Configuration;
  i18n: I18nOptions;
  projectRoot: string;
  projectSourceRoot?: string;
}> {
  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  await checkTsConfigForPreserveWhitespacesSetting(context, options.tsConfig);

  const browserslist = (await import('browserslist')).default;
  const originalOutputPath = options.outputPath;
  // Assets are processed directly by the builder except when watching
  const adjustedOptions = options.watch ? options : { ...options, assets: [] };

  const { config, projectRoot, projectSourceRoot, i18n } =
    await generateI18nBrowserWebpackConfigFromContext(
      {
        ...adjustedOptions,
        aot: true,
        platform: 'server',
      } as NormalizedBrowserBuilderSchema,
      context,
      (wco) => {
        // We use the platform to determine the JavaScript syntax output.
        wco.buildOptions.supportedBrowsers ??= [];
        wco.buildOptions.supportedBrowsers.push(...browserslist('maintained node versions'));

        return [
          getPlatformServerExportsConfig(wco),
          getCommonConfig(wco),
          getStylesConfig(wco),
          {
            plugins: [
              new webpack.DefinePlugin({
                'ngServerMode': true,
              }),
            ],
          },
        ];
      },
    );

  if (options.deleteOutputPath) {
    await deleteOutputDir(context.workspaceRoot, originalOutputPath);
  }

  const transformedConfig = (await webpackConfigurationTransform?.(config)) ?? config;

  return { config: transformedConfig, i18n, projectRoot, projectSourceRoot };
}

async function checkTsConfigForPreserveWhitespacesSetting(
  context: BuilderContext,
  tsConfigPath: string,
): Promise<void> {
  // We don't use the `readTsConfig` method on purpose here.
  // To only catch cases were `preserveWhitespaces` is set directly in the `tsconfig.server.json`,
  // which in the majority of cases will cause a mistmatch between client and server builds.
  // Technically we should check if `tsconfig.server.json` and `tsconfig.app.json` values match.

  // But:
  // 1. It is not guaranteed that `tsconfig.app.json` is used to build the client side of this app.
  // 2. There is no easy way to access the build build config from the server builder.
  // 4. This will no longer be an issue with a single compilation model were the same tsconfig is used for both browser and server builds.
  const content = await readFile(path.join(context.workspaceRoot, tsConfigPath), 'utf-8');
  const { parse } = await import('jsonc-parser');
  const tsConfig = parse(content, [], { allowTrailingComma: true });
  if (tsConfig.angularCompilerOptions?.preserveWhitespaces !== undefined) {
    context.logger.warn(
      `"preserveWhitespaces" was set in "${tsConfigPath}". ` +
        'Make sure that this setting is set consistently in both "tsconfig.server.json" for your server side ' +
        'and "tsconfig.app.json" for your client side. A mismatched value will cause hydration to break.\n' +
        'For more information see: https://angular.dev/guide/hydration#preserve-whitespaces-configuration',
    );
  }
}

/**
 * Add `@angular/platform-server` exports.
 * This is needed so that DI tokens can be referenced and set at runtime outside of the bundle.
 */
function getPlatformServerExportsConfig(wco: BrowserWebpackConfigOptions): Partial<Configuration> {
  // Add `@angular/platform-server` exports.
  // This is needed so that DI tokens can be referenced and set at runtime outside of the bundle.

  // Only add `@angular/platform-server` exports when it is installed.
  // In some cases this builder is used when `@angular/platform-server` is not installed.
  // Example: when using `@nguniversal/common/clover` which does not need `@angular/platform-server`.

  return isPackageInstalled(wco.root, '@angular/platform-server')
    ? {
        module: {
          rules: [
            {
              loader: require.resolve('./platform-server-exports-loader'),
              include: [path.resolve(wco.root, wco.buildOptions.main)],
              options: {
                angularSSRInstalled: isPackageInstalled(wco.root, '@angular/ssr'),
              },
            },
          ],
        },
      }
    : {};
}
