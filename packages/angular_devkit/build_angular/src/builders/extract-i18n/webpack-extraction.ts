/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ɵParsedMessage as LocalizeMessage } from '@angular/localize';
import { BuilderContext } from '@angular-devkit/architect';
import { BuildResult, runWebpack } from '@angular-devkit/build-webpack';
import { lastValueFrom } from 'rxjs';
import webpack, { type Configuration } from 'webpack';
import { getCommonConfig } from '../../tools/webpack/configs';
import { createWebpackLoggingCallback } from '../../tools/webpack/utils/stats';
import { ExecutionTransformer } from '../../transforms';
import { generateBrowserWebpackConfigFromContext } from '../../utils/webpack-browser-config';
import { OutputHashing, Schema } from '../browser/schema';
import { NormalizedExtractI18nOptions } from './options';

class NoEmitPlugin {
  apply(compiler: webpack.Compiler): void {
    compiler.hooks.shouldEmit.tap('angular-no-emit', () => false);
  }
}

export async function extractMessages(
  options: NormalizedExtractI18nOptions,
  builderName: string,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
  } = {},
): Promise<{
  builderResult: BuildResult;
  basePath: string;
  messages: LocalizeMessage[];
  useLegacyIds: boolean;
}> {
  const messages: LocalizeMessage[] = [];
  let useLegacyIds = true;

  const browserOptions = await context.validateOptions(
    await context.getTargetOptions(options.buildTarget),
    builderName,
  );

  const builderOptions = {
    ...browserOptions,
    optimization: false,
    sourceMap: {
      scripts: true,
      styles: false,
      vendor: true,
    },
    buildOptimizer: false,
    aot: true,
    progress: options.progress,
    budgets: [],
    assets: [],
    scripts: [],
    styles: [],
    deleteOutputPath: false,
    extractLicenses: false,
    subresourceIntegrity: false,
    outputHashing: OutputHashing.None,
    namedChunks: true,
    allowedCommonJsDependencies: undefined,
  } as unknown as Schema;
  const { config } = await generateBrowserWebpackConfigFromContext(
    builderOptions,
    context,
    (wco) => {
      // Default value for legacy message ids is currently true
      useLegacyIds = wco.tsConfig.options.enableI18nLegacyMessageIdFormat ?? true;

      const partials: (Promise<Configuration> | Configuration)[] = [
        { plugins: [new NoEmitPlugin()] },
        getCommonConfig(wco),
      ];

      // Add Ivy application file extractor support
      partials.unshift({
        module: {
          rules: [
            {
              test: /\.[cm]?[tj]sx?$/,
              loader: require.resolve('./ivy-extract-loader'),
              options: {
                messageHandler: (fileMessages: LocalizeMessage[]) => messages.push(...fileMessages),
              },
            },
          ],
        },
      });

      // Replace all stylesheets with empty content
      partials.push({
        module: {
          rules: [
            {
              test: /\.(css|scss|sass|less)$/,
              loader: require.resolve('./empty-loader'),
            },
          ],
        },
      });

      return partials;
    },
    // During extraction we don't need specific browser support.
    { supportedBrowsers: undefined },
  );

  const builderResult = await lastValueFrom(
    runWebpack((await transforms?.webpackConfiguration?.(config)) || config, context, {
      logging: createWebpackLoggingCallback(builderOptions, context.logger),
      webpackFactory: webpack,
    }),
  );

  return {
    builderResult,
    basePath: config.context || options.projectRoot,
    messages,
    useLegacyIds,
  };
}
