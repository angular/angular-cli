/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
import { tags, virtualFs } from '@angular-devkit/core';
import { Stats } from 'fs';
import * as path from 'path';
import {
  AngularCompilerPlugin,
  AngularCompilerPluginOptions,
  PLATFORM
} from '@ngtools/webpack';
import { buildOptimizerLoader } from './common';
import { WebpackConfigOptions } from '../build-options';


const g: any = typeof global !== 'undefined' ? global : {};
const webpackLoader: string = g['_DevKitIsLocal']
  ? require.resolve('@ngtools/webpack')
  : '@ngtools/webpack';


function _createAotPlugin(
  wco: WebpackConfigOptions,
  options: any,
  host: virtualFs.Host<Stats>,
  useMain = true,
  extract = false
) {
  const { root, buildOptions } = wco;
  options.compilerOptions = options.compilerOptions || {};

  if (wco.buildOptions.preserveSymlinks) {
    options.compilerOptions.preserveSymlinks = true;
  }

  let i18nInFile = buildOptions.i18nFile
    ? path.resolve(root, buildOptions.i18nFile)
    : undefined;

  const i18nFileAndFormat = extract
    ? {
      i18nOutFile: buildOptions.i18nFile,
      i18nOutFormat: buildOptions.i18nFormat,
    } : {
      i18nInFile: i18nInFile,
      i18nInFormat: buildOptions.i18nFormat,
    };

  const additionalLazyModules: { [module: string]: string } = {};
  if (buildOptions.lazyModules) {
    for (const lazyModule of buildOptions.lazyModules) {
      additionalLazyModules[lazyModule] = path.resolve(
        root,
        lazyModule,
      );
    }
  }

  const pluginOptions: AngularCompilerPluginOptions = {
    mainPath: useMain ? path.join(root, buildOptions.main) : undefined,
    ...i18nFileAndFormat,
    locale: buildOptions.i18nLocale,
    platform: buildOptions.platform === 'server' ? PLATFORM.Server : PLATFORM.Browser,
    missingTranslation: buildOptions.i18nMissingTranslation,
    sourceMap: buildOptions.sourceMap,
    additionalLazyModules,
    nameLazyFiles: buildOptions.namedChunks,
    forkTypeChecker: buildOptions.forkTypeChecker,
    contextElementDependencyConstructor: require('webpack/lib/dependencies/ContextElementDependency'),
    ...options,
    host,
  };
  return new AngularCompilerPlugin(pluginOptions);
}

export function getNonAotConfig(wco: WebpackConfigOptions, host: virtualFs.Host<Stats>) {
  const { tsConfigPath } = wco;

  return {
    module: { rules: [{ test: /\.tsx?$/, loader: webpackLoader }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath, skipCodeGeneration: true }, host)]
  };
}

export function getAotConfig(
  wco: WebpackConfigOptions,
  host: virtualFs.Host<Stats>,
  extract = false
) {
  const { tsConfigPath, buildOptions } = wco;

  const loaders: any[] = [webpackLoader];
  if (buildOptions.buildOptimizer) {
    loaders.unshift({
      loader: buildOptimizerLoader,
      options: { sourceMap: buildOptions.sourceMap }
    });
  }

  const test = /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/;

  return {
    module: { rules: [{ test, use: loaders }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath }, host, true, extract)]
  };
}

export function getNonAotTestConfig(wco: WebpackConfigOptions, host: virtualFs.Host<Stats>) {
  const { tsConfigPath } = wco;

  return {
    module: { rules: [{ test: /\.tsx?$/, loader: webpackLoader }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath, skipCodeGeneration: true }, host, false)]
  };
}
