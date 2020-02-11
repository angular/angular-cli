/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext } from '@angular-devkit/architect';
import {
  getSystemPath,
  logging,
  normalize,
  resolve,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
import { getEsVersionForFileName } from '../angular-cli-files/models/webpack-configs';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import {
  NormalizedBrowserBuilderSchema,
  defaultProgress,
  normalizeBrowserSchema,
} from '../utils';
import { BuildBrowserFeatures } from './build-browser-features';
import { I18nOptions, configureI18nBuild } from './i18n-options';

const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const webpackMerge = require('webpack-merge');

export type BrowserWebpackConfigOptions = WebpackConfigOptions<NormalizedBrowserBuilderSchema>;

export async function generateWebpackConfig(
  context: BuilderContext,
  workspaceRoot: string,
  projectRoot: string,
  sourceRoot: string | undefined,
  options: NormalizedBrowserBuilderSchema,
  webpackPartialGenerator: (wco: BrowserWebpackConfigOptions) => webpack.Configuration[],
  logger: logging.LoggerApi,
): Promise<webpack.Configuration> {
  // Ensure Build Optimizer is only used with AOT.
  if (options.buildOptimizer && !options.aot) {
    throw new Error(`The 'buildOptimizer' option cannot be used without 'aot'.`);
  }

  // Ensure Rollup Concatenation is only used with compatible options.
  if (options.experimentalRollupPass) {
    if (!options.aot) {
      throw new Error(`The 'experimentalRollupPass' option cannot be used without 'aot'.`);
    }

    if (options.vendorChunk || options.commonChunk || options.namedChunks) {
      throw new Error(`The 'experimentalRollupPass' option cannot be used with the`
        + `'vendorChunk', 'commonChunk', 'namedChunks' options set to true.`);
    }
  }

  const tsConfigPath = path.resolve(workspaceRoot, options.tsConfig);
  const tsConfig = readTsconfig(tsConfigPath);

  // tslint:disable-next-line:no-implicit-dependencies
  const ts = await import('typescript');

  // At the moment, only the browser builder supports differential loading
  // However this config generation is used by multiple builders such as dev-server
  const scriptTarget = tsConfig.options.target || ts.ScriptTarget.ES5;
  const buildBrowserFeatures = new BuildBrowserFeatures(projectRoot, scriptTarget);
  const differentialLoading =
    context.builder.builderName === 'browser' &&
    !options.watch &&
    buildBrowserFeatures.isDifferentialLoadingNeeded();

  let buildOptions: NormalizedBrowserBuilderSchema = { ...options };
  if (differentialLoading) {
    buildOptions = {
      ...options,
      // Under downlevel differential loading we copy the assets outside of webpack.
      assets: [],
      esVersionInFileName: true,
      es5BrowserSupport: undefined,
    };
  }

  const supportES2015 = scriptTarget !== ts.ScriptTarget.JSON && scriptTarget > ts.ScriptTarget.ES5;
  const wco: BrowserWebpackConfigOptions = {
    root: workspaceRoot,
    logger: logger.createChild('webpackConfigOptions'),
    projectRoot,
    sourceRoot,
    buildOptions,
    tsConfig,
    tsConfigPath,
    supportES2015,
    differentialLoadingMode: differentialLoading,
  };

  wco.buildOptions.progress = defaultProgress(wco.buildOptions.progress);

  const partials = webpackPartialGenerator(wco);
  const webpackConfig = webpackMerge(partials) as webpack.Configuration;

  if (supportES2015) {
    if (!webpackConfig.resolve) {
      webpackConfig.resolve = {};
    }
    if (!webpackConfig.resolve.alias) {
      webpackConfig.resolve.alias = {};
    }
    webpackConfig.resolve.alias['zone.js/dist/zone'] = 'zone.js/dist/zone-evergreen';
  }

  if (options.profile || process.env['NG_BUILD_PROFILING']) {
    const esVersionInFileName = getEsVersionForFileName(
      tsConfig.options.target,
      wco.buildOptions.esVersionInFileName,
    );

    const smp = new SpeedMeasurePlugin({
      outputFormat: 'json',
      outputTarget: path.resolve(
        workspaceRoot,
        `speed-measure-plugin${esVersionInFileName}.json`,
      ),
    });

    return smp.wrap(webpackConfig);
  }

  return webpackConfig;
}

export async function generateI18nBrowserWebpackConfigFromContext(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  webpackPartialGenerator: (wco: BrowserWebpackConfigOptions) => webpack.Configuration[],
  host: virtualFs.Host<fs.Stats> = new NodeJsSyncHost(),
): Promise<{ config: webpack.Configuration; projectRoot: string; projectSourceRoot?: string, i18n: I18nOptions }> {
  const { buildOptions, i18n } = await configureI18nBuild(context, options);
  const result = await generateBrowserWebpackConfigFromContext(buildOptions, context, webpackPartialGenerator, host);
  const config = result.config;

  if (i18n.shouldInline) {
    // Remove localize "polyfill" if in AOT mode
    if (buildOptions.aot) {
      if (!config.resolve) {
        config.resolve = {};
      }
      if (!config.resolve.alias) {
        config.resolve.alias = {};
      }
      config.resolve.alias['@angular/localize/init'] = require.resolve('./empty.js');
    }

    // Update file hashes to include translation file content
    const i18nHash = Object.values(i18n.locales).reduce(
      (data, locale) => data + (locale.integrity || ''),
      '',
    );
    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.compilation.tap('build-angular', compilation => {
          // Webpack typings do not contain template hashForChunk hook
          // tslint:disable-next-line: no-any
          (compilation.mainTemplate.hooks as any).hashForChunk.tap(
            'build-angular',
            (hash: { update(data: string): void }) => {
              hash.update('$localize' + i18nHash);
            },
          );
          // Webpack typings do not contain hooks property
          // tslint:disable-next-line: no-any
          (compilation.chunkTemplate as any).hooks.hashForChunk.tap(
            'build-angular',
            (hash: { update(data: string): void }) => {
              hash.update('$localize' + i18nHash);
            },
          );
        });
      },
    });
  }

  return { ...result, i18n };
}
export async function generateBrowserWebpackConfigFromContext(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  webpackPartialGenerator: (wco: BrowserWebpackConfigOptions) => webpack.Configuration[],
  host: virtualFs.Host<fs.Stats> = new NodeJsSyncHost(),
): Promise<{ config: webpack.Configuration; projectRoot: string; projectSourceRoot?: string }> {
  const projectName = context.target && context.target.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const workspaceRoot = normalize(context.workspaceRoot);
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = resolve(workspaceRoot, normalize((projectMetadata.root as string) || ''));
  const projectSourceRoot = projectMetadata.sourceRoot as string | undefined;
  const sourceRoot = projectSourceRoot
    ? resolve(workspaceRoot, normalize(projectSourceRoot))
    : undefined;

  const normalizedOptions = normalizeBrowserSchema(
    host,
    workspaceRoot,
    projectRoot,
    sourceRoot,
    options,
  );

  const config = await generateWebpackConfig(
    context,
    getSystemPath(workspaceRoot),
    getSystemPath(projectRoot),
    sourceRoot && getSystemPath(sourceRoot),
    normalizedOptions,
    webpackPartialGenerator,
    context.logger,
  );

  return {
    config,
    projectRoot: getSystemPath(projectRoot),
    projectSourceRoot: sourceRoot && getSystemPath(sourceRoot),
  };
}

export function getIndexOutputFile(options: BrowserBuilderSchema): string {
  if (typeof options.index === 'string') {
    return path.basename(options.index);
  } else {
    return options.index.output || 'index.html';
  }
}

export function getIndexInputFile(options: BrowserBuilderSchema): string {
  if (typeof options.index === 'string') {
    return options.index;
  } else {
    return options.index.input;
  }
}
