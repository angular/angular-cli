/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { purgeStaleBuildCache } from '@angular/build/private';
import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { ConfigOptions, Server } from 'karma';
import * as path from 'node:path';
import webpack, { Configuration } from 'webpack';
import { getCommonConfig, getStylesConfig } from '../../tools/webpack/configs';
import type { ExecutionTransformer } from '../../transforms';
import { generateBrowserWebpackConfigFromContext } from '../../utils/webpack-browser-config';
import { type Schema as BrowserBuilderOptions, OutputHashing } from '../browser/schema';
import { FindTestsPlugin } from './find-tests-plugin';
import type { Schema as KarmaBuilderOptions } from './schema';

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
): AsyncIterable<BuilderOutput> {
  let karmaServer: Server;
  let isCancelled = false;

  return new ReadableStream({
    async start(controller) {
      const [karma, webpackConfig] = await initializeBrowser(
        options,
        context,
        transforms.webpackConfiguration,
      );

      if (isCancelled) {
        return;
      }

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

      const KARMA_APPLICATION_PATH = '_karma_webpack_';
      webpackConfig.output ??= {};
      webpackConfig.output.path = `/${KARMA_APPLICATION_PATH}/`;
      webpackConfig.output.publicPath = `/${KARMA_APPLICATION_PATH}/`;

      if (karmaOptions.singleRun) {
        webpackConfig.plugins.unshift({
          apply: (compiler: webpack.Compiler) => {
            compiler.hooks.afterEnvironment.tap('karma', () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              compiler.watchFileSystem = { watch: () => {} } as any;
            });
          },
        });
      }

      // Remove the watch option to avoid the [DEP_WEBPACK_WATCH_WITHOUT_CALLBACK] warning.
      // The compiler is initialized in watch mode by webpack-dev-middleware.
      delete webpackConfig.watch;

      const compiler = webpack(webpackConfig);

      karmaOptions.buildWebpack = {
        options,
        compiler,
        logger: context.logger,
      };

      const parsedKarmaConfig = await karma.config.parseConfig(
        options.karmaConfig && path.resolve(context.workspaceRoot, options.karmaConfig),
        transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions,
        { promiseConfig: true, throwErrors: true },
      );

      if (isCancelled) {
        return;
      }

      const enqueue = (value: BuilderOutput) => {
        try {
          controller.enqueue(value);
        } catch {
          // Controller is already closed
        }
      };

      const close = () => {
        try {
          controller.close();
        } catch {
          // Controller is already closed
        }
      };

      // Close the stream once the Karma server returns.
      karmaServer = new karma.Server(parsedKarmaConfig, (exitCode) => {
        enqueue({ success: exitCode === 0 });
        close();
      });

      karmaServer.on('run_complete', (_, results) => {
        enqueue({ success: results.exitCode === 0 });
      });

      await karmaServer.start();
    },
    async cancel() {
      isCancelled = true;
      await karmaServer?.stop();
    },
  });
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
  import { provideZoneChangeDetection, ɵcompileNgModuleDefs as compileNgModuleDefs } from '@angular/core';
  import { getTestBed } from '@angular/core/testing';
  import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

  const providers = [];
  if (typeof window.Zone !== 'undefined') {
    providers.push(provideZoneChangeDetection());
  }

  export class TestModule {}
  compileNgModuleDefs(TestModule, {providers});

  // Initialize the Angular testing environment.
  getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true
  });
`,
  ).toString('base64');

  return `ng-virtual-main.js!=!data:text/javascript;base64,${content}`;
}
