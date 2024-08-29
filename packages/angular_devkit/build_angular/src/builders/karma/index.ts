/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { assertCompatibleAngularVersion, purgeStaleBuildCache } from '@angular/build/private';
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { strings } from '@angular-devkit/core';
import type { Config, ConfigOptions } from 'karma';
import { createRequire } from 'module';
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

async function initialize(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  webpackConfigurationTransformer?: ExecutionTransformer<Configuration>,
): Promise<[typeof import('karma'), Configuration]> {
  // Purge old build disk cache.
  await purgeStaleBuildCache(context);

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
    (wco) => [getCommonConfig(wco), getStylesConfig(wco)],
  );

  const karma = await import('karma');

  return [karma, (await webpackConfigurationTransformer?.(config)) ?? config];
}

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export function execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<Configuration>;
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
      // Determine project name from builder context target
      const projectName = context.target?.project;
      if (!projectName) {
        throw new Error(`The 'karma' builder requires a target to be specified.`);
      }

      const karmaOptions: KarmaConfigOptions = options.karmaConfig
        ? {}
        : getBuiltInKarmaConfig(context.workspaceRoot, projectName);

      karmaOptions.singleRun = singleRun;

      // Workaround https://github.com/angular/angular-cli/issues/28271, by clearing context by default
      // for single run executions. Not clearing context for multi-run (watched) builds allows the
      // Jasmine Spec Runner to be visible in the browser after test execution.
      karmaOptions.client ??= {};
      karmaOptions.client.clearContext ??= singleRun ?? false; // `singleRun` defaults to `false` per Karma docs.

      // Convert browsers from a string to an array
      if (typeof options.browsers === 'string' && options.browsers) {
        karmaOptions.browsers = options.browsers.split(',');
      } else if (options.browsers === false) {
        karmaOptions.browsers = [];
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

      const projectMetadata = await context.getProjectMetadata(projectName);
      const sourceRoot = (projectMetadata.sourceRoot ?? projectMetadata.root ?? '') as string;

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

function getBuiltInKarmaConfig(
  workspaceRoot: string,
  projectName: string,
): ConfigOptions & Record<string, unknown> {
  let coverageFolderName = projectName.charAt(0) === '@' ? projectName.slice(1) : projectName;
  if (/[A-Z]/.test(coverageFolderName)) {
    coverageFolderName = strings.dasherize(coverageFolderName);
  }

  const workspaceRootRequire = createRequire(workspaceRoot + '/');

  // Any changes to the config here need to be synced to: packages/schematics/angular/config/files/karma.conf.js.template
  return {
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-jasmine-html-reporter',
      'karma-coverage',
      '@angular-devkit/build-angular/plugins/karma',
    ].map((p) => workspaceRootRequire(p)),
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: path.join(workspaceRoot, 'coverage', coverageFolderName),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      // Chrome configured to run in a bazel sandbox.
      // Disable the use of the gpu and `/dev/shm` because it causes Chrome to
      // crash on some environments.
      // See:
      //   https://github.com/puppeteer/puppeteer/blob/v1.0.0/docs/troubleshooting.md#tips
      //   https://stackoverflow.com/questions/50642308/webdriverexception-unknown-error-devtoolsactiveport-file-doesnt-exist-while-t
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,
  };
}

export type { KarmaBuilderOptions };
export default createBuilder<Record<string, string> & KarmaBuilderOptions>(execute);

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
