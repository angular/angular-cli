/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import * as path from 'node:path';
import { Configuration, javascript } from 'webpack';
import { merge as webpackMerge } from 'webpack-merge';
import { Schema as BrowserBuilderSchema } from '../builders/browser/schema';
import {
  BuilderWatchPlugin,
  BuilderWatcherFactory,
} from '../tools/webpack/plugins/builder-watch-plugin';
import { NormalizedBrowserBuilderSchema, defaultProgress, normalizeBrowserSchema } from '../utils';
import { WebpackConfigOptions } from '../utils/build-options';
import { readTsconfig } from '../utils/read-tsconfig';
import { I18nOptions, configureI18nBuild } from './i18n-webpack';

export type BrowserWebpackConfigOptions = WebpackConfigOptions<NormalizedBrowserBuilderSchema>;

export type WebpackPartialGenerator = (
  configurationOptions: BrowserWebpackConfigOptions,
) => (Promise<Configuration> | Configuration)[];

export async function generateWebpackConfig(
  workspaceRoot: string,
  projectRoot: string,
  sourceRoot: string | undefined,
  projectName: string,
  options: NormalizedBrowserBuilderSchema,
  webpackPartialGenerator: WebpackPartialGenerator,
  logger: BuilderContext['logger'],
  extraBuildOptions: Partial<NormalizedBrowserBuilderSchema>,
): Promise<Configuration> {
  // Ensure Build Optimizer is only used with AOT.
  if (options.buildOptimizer && !options.aot) {
    throw new Error(`The 'buildOptimizer' option cannot be used without 'aot'.`);
  }

  const tsConfigPath = path.resolve(workspaceRoot, options.tsConfig);
  const tsConfig = await readTsconfig(tsConfigPath);

  const buildOptions: NormalizedBrowserBuilderSchema = { ...options, ...extraBuildOptions };
  const wco: BrowserWebpackConfigOptions = {
    root: workspaceRoot,
    logger: logger.createChild('webpackConfigOptions'),
    projectRoot,
    sourceRoot,
    buildOptions,
    tsConfig,
    tsConfigPath,
    projectName,
  };

  wco.buildOptions.progress = defaultProgress(wco.buildOptions.progress);

  const partials = await Promise.all(webpackPartialGenerator(wco));
  const webpackConfig = webpackMerge(partials);

  return webpackConfig;
}

export async function generateI18nBrowserWebpackConfigFromContext(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  webpackPartialGenerator: WebpackPartialGenerator,
  extraBuildOptions: Partial<NormalizedBrowserBuilderSchema> = {},
): Promise<{
  config: Configuration;
  projectRoot: string;
  projectSourceRoot?: string;
  i18n: I18nOptions;
}> {
  const { buildOptions, i18n } = await configureI18nBuild(context, options);
  const result = await generateBrowserWebpackConfigFromContext(
    buildOptions,
    context,
    (wco) => {
      return webpackPartialGenerator(wco);
    },
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
          name: '@angular/localize/init',
          alias: false,
        });
      } else {
        if (!config.resolve.alias) {
          config.resolve.alias = {};
        }
        config.resolve.alias['@angular/localize/init'] = false;
      }
    }

    // Update file hashes to include translation file content
    const i18nHash = Object.values(i18n.locales).reduce(
      (data, locale) => data + locale.files.map((file) => file.integrity || '').join('|'),
      '',
    );

    config.plugins ??= [];
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.compilation.tap('build-angular', (compilation) => {
          javascript.JavascriptModulesPlugin.getCompilationHooks(compilation).chunkHash.tap(
            'build-angular',
            (_, hash) => {
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
  webpackPartialGenerator: WebpackPartialGenerator,
  extraBuildOptions: Partial<NormalizedBrowserBuilderSchema> = {},
): Promise<{ config: Configuration; projectRoot: string; projectSourceRoot?: string }> {
  const projectName = context.target && context.target.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const workspaceRoot = context.workspaceRoot;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = path.join(workspaceRoot, (projectMetadata.root as string | undefined) ?? '');
  const sourceRoot = projectMetadata.sourceRoot as string | undefined;
  const projectSourceRoot = sourceRoot ? path.join(workspaceRoot, sourceRoot) : undefined;

  const normalizedOptions = normalizeBrowserSchema(
    workspaceRoot,
    projectRoot,
    projectSourceRoot,
    options,
    projectMetadata,
    context.logger,
  );

  const config = await generateWebpackConfig(
    workspaceRoot,
    projectRoot,
    projectSourceRoot,
    projectName,
    normalizedOptions,
    webpackPartialGenerator,
    context.logger,
    extraBuildOptions,
  );

  // If builder watch support is present in the context, add watch plugin
  // This is internal only and currently only used for testing
  const watcherFactory = (
    context as {
      watcherFactory?: BuilderWatcherFactory;
    }
  ).watcherFactory;
  if (watcherFactory) {
    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push(new BuilderWatchPlugin(watcherFactory));
  }

  return {
    config,
    projectRoot,
    projectSourceRoot,
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
