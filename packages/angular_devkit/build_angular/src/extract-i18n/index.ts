/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BuilderContext,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { BuildResult, WebpackLoggingCallback, runWebpack } from '@angular-devkit/build-webpack';
import { JsonObject } from '@angular-devkit/core';
import * as path from 'path';
import * as webpack from 'webpack';
import {
  getAotConfig,
  getCommonConfig,
  getStatsConfig,
  getStylesConfig,
} from '../angular-cli-files/models/webpack-configs';
import { statsErrorsToString, statsWarningsToString } from '../angular-cli-files/utilities/stats';
import { Schema as BrowserBuilderOptions } from '../browser/schema';
import { createI18nOptions } from '../utils/i18n-options';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import { Format, Schema } from './schema';

export type ExtractI18nBuilderOptions = Schema & JsonObject;

function getI18nOutfile(format: string | undefined) {
  switch (format) {
    case 'xmb':
      return 'messages.xmb';
    case 'xlf':
    case 'xlif':
    case 'xliff':
    case 'xlf2':
    case 'xliff2':
      return 'messages.xlf';
    default:
      throw new Error(`Unsupported format "${format}"`);
  }
}

class InMemoryOutputPlugin {
  apply(compiler: webpack.Compiler): void {
    // tslint:disable-next-line:no-any
    compiler.outputFileSystem = new (webpack as any).MemoryOutputFileSystem();
  }
}

export async function execute(
  options: ExtractI18nBuilderOptions,
  context: BuilderContext,
): Promise<BuildResult> {
  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot, context.logger);

  const browserTarget = targetFromTargetString(options.browserTarget);
  const browserOptions = await context.validateOptions<JsonObject & BrowserBuilderOptions>(
    await context.getTargetOptions(browserTarget),
    await context.getBuilderNameForTarget(browserTarget),
  );

  if (options.i18nFormat !== Format.Xlf) {
    options.format = options.i18nFormat;
  }

  switch (options.format) {
    case Format.Xlf:
    case Format.Xlif:
    case Format.Xliff:
      options.format = Format.Xlf;
      break;
    case Format.Xlf2:
    case Format.Xliff2:
      options.format = Format.Xlf2;
      break;
  }

  // We need to determine the outFile name so that AngularCompiler can retrieve it.
  let outFile = options.outFile || getI18nOutfile(options.format);
  if (options.outputPath) {
    // AngularCompilerPlugin doesn't support genDir so we have to adjust outFile instead.
    outFile = path.join(options.outputPath, outFile);
  }

  const projectName = context.target && context.target.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }
  // target is verified in the above call
  // tslint:disable-next-line: no-non-null-assertion
  const metadata = await context.getProjectMetadata(context.target!);
  const i18n = createI18nOptions(metadata);

  const { config } = await generateBrowserWebpackConfigFromContext(
    {
      ...browserOptions,
      optimization: {
        scripts: false,
        styles: false,
      },
      buildOptimizer: false,
      i18nLocale: options.i18nLocale || i18n.sourceLocale,
      i18nFormat: options.format,
      i18nFile: outFile,
      aot: true,
      progress: options.progress,
      assets: [],
      scripts: [],
      styles: [],
      deleteOutputPath: false,
    },
    context,
    wco => [
      { plugins: [new InMemoryOutputPlugin()] },
      getCommonConfig(wco),
      getAotConfig(wco, true),
      getStylesConfig(wco),
      getStatsConfig(wco),
    ],
  );

  const logging: WebpackLoggingCallback = (stats, config) => {
    const json = stats.toJson({ errors: true, warnings: true });

    if (stats.hasWarnings()) {
      context.logger.warn(statsWarningsToString(json, config.stats));
    }

    if (stats.hasErrors()) {
      context.logger.error(statsErrorsToString(json, config.stats));
    }
  };

  return runWebpack(config, context, {
    logging,
    webpackFactory: await import('webpack'),
  }).toPromise();
}

export default createBuilder<JsonObject & ExtractI18nBuilderOptions>(execute);
