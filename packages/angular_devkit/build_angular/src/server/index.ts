/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { runWebpack } from '@angular-devkit/build-webpack';
import { json, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, from, of } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { ScriptTarget } from 'typescript';
import * as webpack from 'webpack';
import {
  getAotConfig,
  getCommonConfig,
  getServerConfig,
  getStatsConfig,
  getStylesConfig,
} from '../angular-cli-files/models/webpack-configs';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { ExecutionTransformer } from '../transforms';
import { NormalizedBrowserBuilderSchema, deleteOutputDir } from '../utils';
import { i18nInlineEmittedFiles } from '../utils/i18n-inlining';
import { I18nOptions } from '../utils/i18n-options';
import { ensureOutputPaths } from '../utils/output-paths';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateI18nBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import { Schema as ServerBuilderOptions } from './schema';

// If success is true, outputPath should be set.
export type ServerBuilderOutput = json.JsonObject & BuilderOutput & {
  outputPath?: string;
};

export { ServerBuilderOptions };

export function execute(
  options: ServerBuilderOptions,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
  } = {},
): Observable<ServerBuilderOutput> {
  const host = new NodeJsSyncHost();
  const root = context.workspaceRoot;

  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot, context.logger);

  const tsConfig = readTsconfig(options.tsConfig, context.workspaceRoot);
  const target = tsConfig.options.target || ScriptTarget.ES5;
  const baseOutputPath = path.resolve(context.workspaceRoot, options.outputPath);

  return from(initialize(options, context, host, transforms.webpackConfiguration)).pipe(
    concatMap(({ config, i18n }) => {
      return runWebpack(config, context).pipe(
        concatMap(async output => {
          const { emittedFiles = [], webpackStats } = output;
          if (!output.success || !i18n.shouldInline) {
            return output;
          }

          if (!webpackStats) {
            throw new Error('Webpack stats build result is required.');
          }

          const outputPaths = ensureOutputPaths(baseOutputPath, i18n);

          const success = await i18nInlineEmittedFiles(
            context,
            emittedFiles,
            i18n,
            baseOutputPath,
            outputPaths,
            [],
            // tslint:disable-next-line: no-non-null-assertion
            webpackStats.outputPath!,
            target <= ScriptTarget.ES5,
            options.i18nMissingTranslation,
          );

          return { output, success };
        }),
      );
    }),
    map(output => {
      if (!output.success) {
        return output as ServerBuilderOutput;
      }

      return {
        ...output,
        outputPath: path.resolve(root, options.outputPath),
      } as ServerBuilderOutput;
    }),
  );
}

export default createBuilder<json.JsonObject & ServerBuilderOptions, ServerBuilderOutput>(
  execute,
);

async function initialize(
  options: ServerBuilderOptions,
  context: BuilderContext,
  host: virtualFs.Host<fs.Stats>,
  webpackConfigurationTransform?: ExecutionTransformer<webpack.Configuration>,
): Promise<{
  config: webpack.Configuration;
  i18n: I18nOptions;
}> {
  const originalOutputPath = options.outputPath;
  const { config, i18n } = await generateI18nBrowserWebpackConfigFromContext(
    {
      ...options,
      buildOptimizer: false,
      aot: true,
      platform: 'server',
    } as NormalizedBrowserBuilderSchema,
    context,
    wco => [
      getCommonConfig(wco),
      getServerConfig(wco),
      getStylesConfig(wco),
      getStatsConfig(wco),
      getAotConfig(wco),
    ],
  );

  let transformedConfig;
  if (webpackConfigurationTransform) {
    transformedConfig = await webpackConfigurationTransform(config);
  }

  if (options.deleteOutputPath) {
    deleteOutputDir(
      context.workspaceRoot,
      originalOutputPath,
    );
  }

  return { config: transformedConfig || config, i18n };
}
