/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { runWebpack } from '@angular-devkit/build-webpack';
import { json, normalize } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as path from 'path';
import { Observable, from, of } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
import {
  getAotConfig,
  getCommonConfig,
  getNonAotConfig,
  getServerConfig,
  getStatsConfig,
  getStylesConfig,
} from '../angular-cli-files/models/webpack-configs';
import { ExecutionTransformer } from '../transforms';
import { NormalizedBrowserBuilderSchema, deleteOutputDir } from '../utils';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
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

  return from(buildServerWebpackConfig(options, context)).pipe(
    concatMap(async v => transforms.webpackConfiguration ? transforms.webpackConfiguration(v) : v),
    concatMap(v => {
      if (options.deleteOutputPath) {
        return deleteOutputDir(normalize(root), normalize(options.outputPath), host).pipe(
          map(() => v),
        );
      } else {
        return of(v);
      }
    }),
    concatMap(webpackConfig => runWebpack(webpackConfig, context)),
    map(output => {
      if (output.success === false) {
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

function getCompilerConfig(wco: WebpackConfigOptions) {
  if (wco.buildOptions.main || wco.buildOptions.polyfills) {
    return wco.buildOptions.aot ? getAotConfig(wco) : getNonAotConfig(wco);
  }

  return {};
}

async function buildServerWebpackConfig(
  options: ServerBuilderOptions,
  context: BuilderContext,
) {
  const { config } = await generateBrowserWebpackConfigFromContext(
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
      getCompilerConfig(wco),
    ],
  );

  return config[0];
}
