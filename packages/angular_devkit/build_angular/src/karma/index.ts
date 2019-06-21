/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { experimental, getSystemPath, join } from '@angular-devkit/core';
import { dirname, resolve } from 'path';
import { Observable, from } from 'rxjs';
import { defaultIfEmpty, switchMap } from 'rxjs/operators';
import * as webpack from 'webpack';
import {
  getCommonConfig,
  getNonAotConfig,
  getStylesConfig,
  getTestConfig,
  getWorkerConfig,
} from '../angular-cli-files/models/webpack-configs';
import {
  SingleTestTransformLoader,
  SingleTestTransformLoaderOptions,
} from '../angular-cli-files/plugins/single-test-transform';
import { findTests } from '../angular-cli-files/utilities/find-tests';
import { Schema as BrowserBuilderOptions } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import { Schema as KarmaBuilderOptions } from './schema';

// tslint:disable-next-line:no-implicit-dependencies
export type KarmaConfigOptions = import('karma').ConfigOptions & {
  buildWebpack?: unknown;
  configFile?: string;
};

async function initialize(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  webpackConfigurationTransformer?: ExecutionTransformer<webpack.Configuration>,
  // tslint:disable-next-line:no-implicit-dependencies
): Promise<[experimental.workspace.Workspace, typeof import('karma'), webpack.Configuration]> {
  const { config, workspace } = await generateBrowserWebpackConfigFromContext(
    // only two properties are missing:
    // * `outputPath` which is fixed for tests
    // * `budgets` which might be incorrect due to extra dev libs
    { ...((options as unknown) as BrowserBuilderOptions), outputPath: '', budgets: undefined },
    context,
    wco => [
      getCommonConfig(wco),
      getStylesConfig(wco),
      getNonAotConfig(wco),
      getTestConfig(wco),
      getWorkerConfig(wco),
    ],
  );

  // tslint:disable-next-line:no-implicit-dependencies
  const karma = await import('karma');

  return [
    workspace,
    karma,
    webpackConfigurationTransformer ? await webpackConfigurationTransformer(config[0]) : config[0],
  ];
}

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
  assertCompatibleAngularVersion(context.workspaceRoot, context.logger);

  return from(initialize(options, context, transforms.webpackConfiguration)).pipe(
    switchMap(
      ([workspace, karma, webpackConfig]) =>
        new Observable<BuilderOutput>(subscriber => {
          const karmaOptions: KarmaConfigOptions = {};

          if (options.watch !== undefined) {
            karmaOptions.singleRun = !options.watch;
          }

          // Convert browsers from a string to an array
          if (options.browsers) {
            karmaOptions.browsers = options.browsers.split(',');
          }

          if (options.reporters) {
            // Split along commas to make it more natural, and remove empty strings.
            const reporters = options.reporters
              .reduce<string[]>((acc, curr) => acc.concat(curr.split(',')), [])
              .filter(x => !!x);

            if (reporters.length > 0) {
              karmaOptions.reporters = reporters;
            }
          }

          // prepend special webpack loader that will transform test.ts
          if (
            webpackConfig &&
            webpackConfig.module &&
            options.include &&
            options.include.length > 0
          ) {
            const mainFilePath = getSystemPath(join(workspace.root, options.main));
            const files = findTests(
              options.include,
              dirname(mainFilePath),
              getSystemPath(workspace.root),
            );
            // early exit, no reason to start karma
            if (!files.length) {
              subscriber.error(
                `Specified patterns: "${options.include.join(', ')}" did not match any spec files`,
              );

              return;
            }

            webpackConfig.module.rules.unshift({
              test: path => path === mainFilePath,
              use: {
                // cannot be a simple path as it differs between environments
                loader: SingleTestTransformLoader,
                options: {
                  files,
                  logger: context.logger,
                } as SingleTestTransformLoaderOptions,
              },
            });
          }

          // Assign additional karmaConfig options to the local ngapp config
          karmaOptions.configFile = resolve(context.workspaceRoot, options.karmaConfig);

          karmaOptions.buildWebpack = {
            options,
            webpackConfig,
            // Pass onto Karma to emit BuildEvents.
            successCb: () => subscriber.next({ success: true }),
            failureCb: () => subscriber.next({ success: false }),
            // Workaround for https://github.com/karma-runner/karma/issues/3154
            // When this workaround is removed, user projects need to be updated to use a Karma
            // version that has a fix for this issue.
            toJSON: () => {},
            logger: context.logger,
          };

          // Complete the observable once the Karma server returns.
          const karmaServer = new karma.Server(
            transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions,
            () => subscriber.complete(),
          );
          // karma typings incorrectly define start's return value as void
          // tslint:disable-next-line:no-use-of-empty-return-value
          const karmaStart = (karmaServer.start() as unknown) as Promise<void>;

          // Cleanup, signal Karma to exit.
          return () => {
            // Karma only has the `stop` method start with 3.1.1, so we must defensively check.
            const karmaServerWithStop = (karmaServer as unknown) as { stop: () => Promise<void> };
            if (typeof karmaServerWithStop.stop === 'function') {
              return karmaStart.then(() => karmaServerWithStop.stop());
            }
          };
        }),
    ),
    defaultIfEmpty({ success: false }),
  );
}

export { KarmaBuilderOptions };
export default createBuilder<Record<string, string> & KarmaBuilderOptions>(execute);
