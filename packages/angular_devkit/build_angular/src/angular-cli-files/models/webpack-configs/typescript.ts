/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
import * as path from 'path';
import {
  AngularCompilerPlugin,
  AngularCompilerPluginOptions,
  NgToolsLoader,
  PLATFORM
} from '@ngtools/webpack';
import { buildOptimizerLoader } from './common';
import { WebpackConfigOptions, BuildOptions } from '../build-options';

function _pluginOptionsOverrides(
  buildOptions: BuildOptions,
  pluginOptions: AngularCompilerPluginOptions
): AngularCompilerPluginOptions {
  const compilerOptions = {
    ...(pluginOptions.compilerOptions || {})
  }

  const hostReplacementPaths: { [replace: string]: string } = {};
  if (buildOptions.fileReplacements) {
    for (const replacement of buildOptions.fileReplacements) {
      hostReplacementPaths[replacement.replace] = replacement.with;
    }
  }

  if (buildOptions.scriptTargetOverride) {
    compilerOptions.target = buildOptions.scriptTargetOverride;
  }

  if (buildOptions.preserveSymlinks) {
    compilerOptions.preserveSymlinks = true;
  }

  return {
    ...pluginOptions,
    hostReplacementPaths,
    compilerOptions
  };
}

function _createAotPlugin(
  wco: WebpackConfigOptions,
  options: any,
  useMain = true,
  extract = false,
) {
  const { root, buildOptions } = wco;

  const i18nInFile = buildOptions.i18nFile
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

  let pluginOptions: AngularCompilerPluginOptions = {
    mainPath: useMain ? path.join(root, buildOptions.main) : undefined,
    ...i18nFileAndFormat,
    locale: buildOptions.i18nLocale,
    platform: buildOptions.platform === 'server' ? PLATFORM.Server : PLATFORM.Browser,
    missingTranslation: buildOptions.i18nMissingTranslation,
    sourceMap: buildOptions.sourceMap.scripts,
    additionalLazyModules,
    nameLazyFiles: buildOptions.namedChunks,
    forkTypeChecker: buildOptions.forkTypeChecker,
    contextElementDependencyConstructor: require('webpack/lib/dependencies/ContextElementDependency'),
    logger: wco.logger,
    directTemplateLoading: true,
    ...options,
  };

  pluginOptions = _pluginOptionsOverrides(buildOptions, pluginOptions);

  return new AngularCompilerPlugin(pluginOptions);
}

export function getNonAotConfig(wco: WebpackConfigOptions) {
  const { tsConfigPath } = wco;

  return {
    module: { rules: [{ test: /\.tsx?$/, loader: NgToolsLoader }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath, skipCodeGeneration: true })]
  };
}

export function getAotConfig(wco: WebpackConfigOptions, extract = false) {
  const { tsConfigPath, buildOptions } = wco;

  const loaders: any[] = [NgToolsLoader];
  if (buildOptions.buildOptimizer) {
    loaders.unshift({
      loader: buildOptimizerLoader,
      options: { sourceMap: buildOptions.sourceMap.scripts }
    });
  }

  const test = /(?:\.ngfactory\.js|\.ngstyle\.js|\.tsx?)$/;

  return {
    module: { rules: [{ test, use: loaders }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath }, true, extract)]
  };
}

export function getTypescriptWorkerPlugin(wco: WebpackConfigOptions, workerTsConfigPath: string) {
  const { buildOptions } = wco;

  let pluginOptions: AngularCompilerPluginOptions = {
    skipCodeGeneration: true,
    tsConfigPath: workerTsConfigPath,
    mainPath: undefined,
    platform: PLATFORM.Browser,
    sourceMap: buildOptions.sourceMap.scripts,
    forkTypeChecker: buildOptions.forkTypeChecker,
    contextElementDependencyConstructor: require('webpack/lib/dependencies/ContextElementDependency'),
    logger: wco.logger,
    // Run no transformers.
    platformTransformers: [],
    // Don't attempt lazy route discovery.
    discoverLazyRoutes: false,
  };

  pluginOptions = _pluginOptionsOverrides(buildOptions, pluginOptions);

  return new AngularCompilerPlugin(pluginOptions);
}
