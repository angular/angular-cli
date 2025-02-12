/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { purgeStaleBuildCache } from '@angular/build/private';
import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { Config, ConfigOptions } from 'karma';
import * as path from 'path';
import { Observable, defaultIfEmpty, from, switchMap } from 'rxjs';
import { Configuration } from 'webpack';
import { getCommonConfig, getStylesConfig } from '../../tools/webpack/configs';
import { ExecutionTransformer } from '../../transforms';
import { generateBrowserWebpackConfigFromContext } from '../../utils/webpack-browser-config';
import { Schema as BrowserBuilderOptions, OutputHashing } from '../browser/schema';
import { FindTestsPlugin } from './find-tests-plugin';
import { Schema as KarmaBuilderOptions } from './schema';

export type KarmaConfigOptions = ConfigOptions & {
  buildWebpack?: unknown;
  configFile?: string;
};

export function execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  karmaOptions: KarmaConfigOptions,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<Configuration>;
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: KarmaConfigOptions) => KarmaConfigOptions;
  } = {},
): Observable<BuilderOutput> {
  return from(initializeBrowser(options, context, transforms.webpackConfiguration)).pipe(
    switchMap(async ([karma, webpackConfig]) => {
      const projectName = context.target?.project;
      if (!projectName) {
        throw new Error(`The 'karma' builder requires a target to be specified.`);
      }

      const projectMetadata = await context.getProjectMetadata(projectName);
      const sourceRoot = (projectMetadata.sourceRoot ?? projectMetadata.root ?? '') as string;

      if (!options.main) {
        webpackConfig.entry ??= {};
        if (typeof webpackConfig.entry === 'object' && !Array.isArray(webpackConfig.entry)) {
          if (Array.isArray(webpackConfig.entry['main'])) {
            webpackConfig.entry['main'].push(getBuiltInMainFile());
          } else {
            webpackConfig.entry['main'] = [getBuiltInMainFile()];
          }
        }
      }

      webpackConfig.plugins ??= [];
      webpackConfig.plugins.push(
        new FindTestsPlugin({
          include: options.include,
          exclude: options.exclude,
          workspaceRoot: context.workspaceRoot,
          projectSourceRoot: path.join(context.workspaceRoot, sourceRoot),
        }),
      );

      karmaOptions.buildWebpack = {
        options,
        webpackConfig,
        logger: context.logger,
      };

      const parsedKarmaConfig = await karma.config.parseConfig(
        options.karmaConfig && path.resolve(context.workspaceRoot, options.karmaConfig),
        transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions,
        { promiseConfig: true, throwErrors: true },
      );

      return [karma, parsedKarmaConfig] as [typeof karma, KarmaConfigOptions];
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
          return () => {
            void karmaStart.then(() => karmaServer.stop());
          };
        }),
    ),
    defaultIfEmpty({ success: false }),
  );
}

async function initializeBrowser(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  webpackConfigurationTransformer?: ExecutionTransformer<Configuration>,
): Promise<[typeof import('karma'), Configuration]> {
  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

  const karma = await import('karma');

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
      aot: options.aot,
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
    (wco) => [getCommonConfig(wco), getStylesConfig(wco)],
  );

  return [karma, (await webpackConfigurationTransformer?.(config)) ?? config];
}

function getBuiltInMainFile(): string {
  const content = Buffer.from(
    `
  import { getTestBed } from '@angular/core/testing';
  import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting,
   } from '@angular/platform-browser-dynamic/testing';

  // Initialize the Angular testing environment.
  getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true
  });
`,
  ).toString('base64');

  return `ng-virtual-main.js!=!data:text/javascript;base64,${content}`;
}
