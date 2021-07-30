/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { getSystemPath, join, normalize } from '@angular-devkit/core';
import { Config, ConfigOptions } from 'karma';
import { dirname, resolve } from 'path';
import { Observable, from } from 'rxjs';
import { defaultIfEmpty, switchMap } from 'rxjs/operators';
import * as webpack from 'webpack';
import { Schema as BrowserBuilderOptions, OutputHashing } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import {
  getCommonConfig,
  getStylesConfig,
  getTestConfig,
  getTypeScriptConfig,
  getWorkerConfig,
} from '../webpack/configs';
import { SingleTestTransformLoader } from '../webpack/plugins/single-test-transform';
import { findTests } from './find-tests';
import { Schema as KarmaBuilderOptions } from './schema';

export type KarmaConfigOptions = ConfigOptions & {
  buildWebpack?: unknown;
  configFile?: string;
};

async function initialize(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  webpackConfigurationTransformer?: ExecutionTransformer<webpack.Configuration>,
): Promise<[typeof import('karma'), webpack.Configuration]> {
  const { config } = await generateBrowserWebpackConfigFromContext(
    // only two properties are missing:
    // * `outputPath` which is fixed for tests
    // * `budgets` which might be incorrect due to extra dev libs
    {
      ...(options as unknown as BrowserBuilderOptions),
      outputPath: '',
      budgets: undefined,
      optimization: false,
      buildOptimizer: false,
      aot: false,
      vendorChunk: true,
      namedChunks: true,
      extractLicenses: false,
      outputHashing: OutputHashing.None,
      // The webpack tier owns the watch behavior so we want to force it in the config.
      // When not in watch mode, webpack-dev-middleware will call `compiler.watch` anyway.
      // https://github.com/webpack/webpack-dev-middleware/blob/698c9ae5e9bb9a013985add6189ff21c1a1ec185/src/index.js#L65
      // https://github.com/webpack/webpack/blob/cde1b73e12eb8a77eb9ba42e7920c9ec5d29c2c9/lib/Compiler.js#L379-L388
      watch: true,
    },
    context,
    (wco) => [
      getCommonConfig(wco),
      getStylesConfig(wco),
      getTypeScriptConfig(wco),
      getTestConfig(wco),
      getWorkerConfig(wco),
    ],
  );

  const karma = await import('karma');

  return [
    karma,
    webpackConfigurationTransformer ? await webpackConfigurationTransformer(config) : config,
  ];
}

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export function execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: KarmaConfigOptions) => KarmaConfigOptions;
  } = {},
): Observable<BuilderOutput> {
  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot);

  let singleRun: boolean | undefined;
  if (options.watch !== undefined) {
    singleRun = !options.watch;
  }

  return from(initialize(options, context, transforms.webpackConfiguration)).pipe(
    switchMap(async ([karma, webpackConfig]) => {
      const karmaOptions: KarmaConfigOptions = {
        singleRun,
      };

      // Convert browsers from a string to an array
      if (options.browsers) {
        karmaOptions.browsers = options.browsers.split(',');
      }

      if (options.reporters) {
        // Split along commas to make it more natural, and remove empty strings.
        const reporters = options.reporters
          .reduce<string[]>((acc, curr) => acc.concat(curr.split(',')), [])
          .filter((x) => !!x);

        if (reporters.length > 0) {
          karmaOptions.reporters = reporters;
        }
      }

      // prepend special webpack loader that will transform test.ts
      if (options.include && options.include.length > 0) {
        const mainFilePath = getSystemPath(join(normalize(context.workspaceRoot), options.main));
        const files = findTests(options.include, dirname(mainFilePath), context.workspaceRoot);
        // early exit, no reason to start karma
        if (!files.length) {
          throw new Error(
            `Specified patterns: "${options.include.join(', ')}" did not match any spec files.`,
          );
        }

        // Get the rules and ensure the Webpack configuration is setup properly
        const rules = webpackConfig.module?.rules || [];
        if (!webpackConfig.module) {
          webpackConfig.module = { rules };
        } else if (!webpackConfig.module.rules) {
          webpackConfig.module.rules = rules;
        }

        rules.unshift({
          test: mainFilePath,
          use: {
            // cannot be a simple path as it differs between environments
            loader: SingleTestTransformLoader,
            options: {
              files,
              logger: context.logger,
            },
          },
        });
      }

      karmaOptions.buildWebpack = {
        options,
        webpackConfig,
        logger: context.logger,
      };

      const config = await karma.config.parseConfig(
        resolve(context.workspaceRoot, options.karmaConfig),
        transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions,
        { promiseConfig: true, throwErrors: true },
      );

      return [karma, config] as [typeof karma, KarmaConfigOptions];
    }),
    switchMap(
      ([karma, karmaConfig]) =>
        new Observable<BuilderOutput>((subscriber) => {
          // Pass onto Karma to emit BuildEvents.
          karmaConfig.buildWebpack ??= {};
          if (typeof karmaConfig.buildWebpack === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (karmaConfig.buildWebpack as any).failureCb ??= () =>
              subscriber.next({ success: false });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (karmaConfig.buildWebpack as any).successCb ??= () =>
              subscriber.next({ success: true });
          }

          // Complete the observable once the Karma server returns.
          const karmaServer = new karma.Server(karmaConfig as Config, (exitCode) => {
            subscriber.next({ success: exitCode === 0 });
            subscriber.complete();
          });

          const karmaStart = karmaServer.start();

          // Cleanup, signal Karma to exit.
          return () => karmaStart.then(() => karmaServer.stop());
        }),
    ),
    defaultIfEmpty({ success: false }),
  );
}

export { KarmaBuilderOptions };
export default createBuilder<Record<string, string> & KarmaBuilderOptions>(execute);
