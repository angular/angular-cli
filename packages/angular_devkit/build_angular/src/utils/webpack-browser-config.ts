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
import { merge as webpackMerge } from 'webpack-merge';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import {
  NormalizedBrowserBuilderSchema,
  defaultProgress,
  normalizeBrowserSchema,
} from '../utils';
import { WebpackConfigOptions } from '../utils/build-options';
import { readTsconfig } from '../utils/read-tsconfig';
import { BuilderWatchPlugin, BuilderWatcherFactory } from '../webpack/plugins/builder-watch-plugin';
import { getEsVersionForFileName } from '../webpack/utils/helpers';
import { profilingEnabled } from './environment-options';
import { I18nOptions, configureI18nBuild } from './i18n-options';

export type BrowserWebpackConfigOptions = WebpackConfigOptions<NormalizedBrowserBuilderSchema>;

export async function generateWebpackConfig(
  workspaceRoot: string,
  projectRoot: string,
  sourceRoot: string | undefined,
  options: NormalizedBrowserBuilderSchema,
  webpackPartialGenerator: (wco: BrowserWebpackConfigOptions) => webpack.Configuration[],
  logger: logging.LoggerApi,
  extraBuildOptions: Partial<NormalizedBrowserBuilderSchema>,
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
  const scriptTarget = tsConfig.options.target || ts.ScriptTarget.ES5;

  const supportES2015 = scriptTarget !== ts.ScriptTarget.JSON && scriptTarget > ts.ScriptTarget.ES5;

  const buildOptions: NormalizedBrowserBuilderSchema = { ...options, ...extraBuildOptions };
  const wco: BrowserWebpackConfigOptions = {
    root: workspaceRoot,
    logger: logger.createChild('webpackConfigOptions'),
    projectRoot,
    sourceRoot,
    buildOptions,
    tsConfig,
    tsConfigPath,
    scriptTarget,
  };

  wco.buildOptions.progress = defaultProgress(wco.buildOptions.progress);

  const webpackConfig = webpackMerge(webpackPartialGenerator(wco));

  if (supportES2015) {
    if (!webpackConfig.resolve) {
      webpackConfig.resolve = {};
    }
    if (Array.isArray(webpackConfig.resolve.alias)) {
      webpackConfig.resolve.alias.push({
        alias: 'zone.js/dist/zone',
        name: 'zone.js/dist/zone-evergreen',
      });
    } else {
      if (!webpackConfig.resolve.alias) {
        webpackConfig.resolve.alias = {};
      }
      webpackConfig.resolve.alias['zone.js/dist/zone'] = 'zone.js/dist/zone-evergreen';
    }
  }

  if (profilingEnabled) {
    const esVersionInFileName = getEsVersionForFileName(
      tsConfig.options.target,
      buildOptions.differentialLoadingMode,
    );

    const SpeedMeasurePlugin = await import('speed-measure-webpack-plugin');
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
  extraBuildOptions: Partial<NormalizedBrowserBuilderSchema> = {},
): Promise<{ config: webpack.Configuration; projectRoot: string; projectSourceRoot?: string, i18n: I18nOptions }> {
  const { buildOptions, i18n } = await configureI18nBuild(context, options);
  const result = await generateBrowserWebpackConfigFromContext(
    buildOptions,
    context,
    webpackPartialGenerator,
    host,
    extraBuildOptions,
  );
  const config = result.config;

  if (i18n.shouldInline) {
    // Remove localize "polyfill" if in AOT mode
    if (buildOptions.aot) {
      if (!config.resolve) {
        config.resolve = {};
      }
      if (Array.isArray(config.resolve.alias)) {
        config.resolve.alias.push({
          alias: '@angular/localize/init',
          name: require.resolve('./empty.js'),
        });
      } else {
        if (!config.resolve.alias) {
          config.resolve.alias = {};
        }
        config.resolve.alias['@angular/localize/init'] = require.resolve('./empty.js');
      }
    }

    // Update file hashes to include translation file content
    const i18nHash = Object.values(i18n.locales).reduce(
      (data, locale) => data + locale.files.map((file) => file.integrity || '').join('|'),
      '',
    );
    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push({
      apply(compiler: webpack.Compiler) {
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
  extraBuildOptions: Partial<NormalizedBrowserBuilderSchema> = {},
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
    getSystemPath(workspaceRoot),
    getSystemPath(projectRoot),
    sourceRoot && getSystemPath(sourceRoot),
    normalizedOptions,
    webpackPartialGenerator,
    context.logger,
    extraBuildOptions,
  );

  // If builder watch support is present in the context, add watch plugin
  // This is internal only and currently only used for testing
  const watcherFactory = (context as {
    watcherFactory?: BuilderWatcherFactory;
  }).watcherFactory;
  if (watcherFactory) {
    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push(new BuilderWatchPlugin(watcherFactory));
  }

  return {
    config,
    projectRoot: getSystemPath(projectRoot),
    projectSourceRoot: sourceRoot && getSystemPath(sourceRoot),
  };
}

export function getIndexOutputFile(index: BrowserBuilderSchema['index']): string {
  if (typeof index === 'string') {
    return path.basename(index);
  } else {
    return index.output || 'index.html';
  }
}

export function getIndexInputFile(index: BrowserBuilderSchema['index']): string {
  if (typeof index === 'string') {
    return index;
  } else {
    return index.input;
  }
}
