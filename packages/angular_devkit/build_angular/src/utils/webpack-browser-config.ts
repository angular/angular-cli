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
  fullDifferential,
  normalizeBrowserSchema,
} from '../utils';
import { BuildBrowserFeatures } from './build-browser-features';

const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const webpackMerge = require('webpack-merge');

type BrowserWebpackConfigOptions = WebpackConfigOptions<NormalizedBrowserBuilderSchema>;

export async function generateWebpackConfig(
  context: BuilderContext,
  workspaceRoot: string,
  projectRoot: string,
  sourceRoot: string | undefined,
  options: NormalizedBrowserBuilderSchema,
  webpackPartialGenerator: (wco: BrowserWebpackConfigOptions) => webpack.Configuration[],
  logger: logging.LoggerApi,
): Promise<webpack.Configuration[]> {
  // Ensure Build Optimizer is only used with AOT.
  if (options.buildOptimizer && !options.aot) {
    throw new Error(`The 'buildOptimizer' option cannot be used without 'aot'.`);
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

  const scriptTargets = [scriptTarget];

  if (differentialLoading && fullDifferential) {
    scriptTargets.push(ts.ScriptTarget.ES5);
  }

  // For differential loading, we can have several targets
  return scriptTargets.map(scriptTarget => {
    let buildOptions: NormalizedBrowserBuilderSchema = { ...options };
    const supportES2015 =
      scriptTarget !== ts.ScriptTarget.ES3 && scriptTarget !== ts.ScriptTarget.ES5;

    if (differentialLoading && fullDifferential) {
      buildOptions = {
        ...options,
        ...// FIXME: we do create better webpack config composition to achieve the below
        // When DL is enabled and supportES2015 is true it means that we are on the second build
        // This also means that we don't need to include styles and assets multiple times
        (supportES2015
          ? {}
          : {
              styles: options.extractCss ? [] : options.styles,
              assets: [],
            }),
        es5BrowserSupport: undefined,
        esVersionInFileName: true,
        scriptTargetOverride: scriptTarget,
      };
    } else if (differentialLoading && !fullDifferential) {
      buildOptions = {
        ...options,
        esVersionInFileName: true,
        scriptTargetOverride: ts.ScriptTarget.ES5,
        es5BrowserSupport: undefined,
      };
    }

    const wco: BrowserWebpackConfigOptions = {
      root: workspaceRoot,
      logger: logger.createChild('webpackConfigOptions'),
      projectRoot,
      sourceRoot,
      buildOptions,
      tsConfig,
      tsConfigPath,
      supportES2015,
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
        fullDifferential ? buildOptions.scriptTargetOverride : tsConfig.options.target,
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
  });
}

export async function generateBrowserWebpackConfigFromContext(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  webpackPartialGenerator: (wco: BrowserWebpackConfigOptions) => webpack.Configuration[],
  host: virtualFs.Host<fs.Stats> = new NodeJsSyncHost(),
): Promise<{ config: webpack.Configuration[]; projectRoot: string; projectSourceRoot?: string }> {
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
