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
import { WebpackConfigOptions } from '../build-options';

const SilentError = require('silent-error');


const g: any = typeof global !== 'undefined' ? global : {};
const webpackLoader: string = require.resolve('@ngtools/webpack');


function _createAotPlugin(
  wco: WebpackConfigOptions,
  options: any,
  host: virtualFs.Host<Stats>,
  useMain = true,
) {
  const { root, buildOptions } = wco;
  options.compilerOptions = options.compilerOptions || {};

  if (wco.buildOptions.preserveSymlinks) {
    options.compilerOptions.preserveSymlinks = true;
  }

  let i18nInFile = buildOptions.i18nFile
    ? path.resolve(root, buildOptions.i18nFile)
    : undefined;

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
    i18nInFile: i18nInFile,
    i18nInFormat: buildOptions.i18nFormat,
    i18nOutFile: buildOptions.i18nOutFile,
    i18nOutFormat: buildOptions.i18nOutFormat,
    locale: buildOptions.i18nLocale,
    platform: buildOptions.platform === 'server' ? PLATFORM.Server : PLATFORM.Browser,
    missingTranslation: buildOptions.i18nMissingTranslation,
    sourceMap: buildOptions.sourceMap,
    additionalLazyModules,
    nameLazyFiles: buildOptions.namedChunks,
    forkTypeChecker: buildOptions.forkTypeChecker,
    ...options,
    host,
  };
  return new AngularCompilerPlugin(pluginOptions);
}

export function getNonAotConfig(wco: WebpackConfigOptions, host: virtualFs.Host<Stats>) {
  const { tsConfigPath } = wco;

  return {
    module: { rules: [{ test: /\.ts$/, loader: webpackLoader }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath, skipCodeGeneration: true }, host)]
  };
}

export function getAotConfig(wco: WebpackConfigOptions, host: virtualFs.Host<Stats>) {
  const { tsConfigPath, buildOptions } = wco;

  const loaders: any[] = [webpackLoader];
  if (buildOptions.buildOptimizer) {
    loaders.unshift({
      loader: '@angular-devkit/build-optimizer/webpack-loader',
      options: { sourceMap: buildOptions.sourceMap }
    });
  }

  const test = /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/;

  return {
    module: { rules: [{ test, use: loaders }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath }, host)]
  };
}

export function getNonAotTestConfig(wco: WebpackConfigOptions, host: virtualFs.Host<Stats>) {
  const { tsConfigPath } = wco;

  return {
    module: { rules: [{ test: /\.ts$/, loader: webpackLoader }] },
    plugins: [_createAotPlugin(wco, { tsConfigPath, skipCodeGeneration: true }, host, false)]
  };
}
