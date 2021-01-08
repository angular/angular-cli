/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.
import { CompilerOptions } from '@angular/compiler-cli';
import { buildOptimizerLoaderPath } from '@angular-devkit/build-optimizer';
import { getSystemPath } from '@angular-devkit/core';
import {
  AngularCompilerPlugin,
  AngularCompilerPluginOptions,
  NgToolsLoader,
  PLATFORM,
  ivy,
} from '@ngtools/webpack';
import * as path from 'path';
import { RuleSetLoader } from 'webpack';
import { WebpackConfigOptions, BuildOptions } from '../../utils/build-options';
import { legacyIvyPluginEnabled } from '../../utils/environment-options';

function canUseIvyPlugin(wco: WebpackConfigOptions): boolean {
  // Can only be used with Ivy
  if (!wco.tsConfig.options.enableIvy) {
    return false;
  }

  // Allow fallback to legacy build system via environment variable ('NG_BUILD_IVY_LEGACY=1')
  if (legacyIvyPluginEnabled) {
    wco.logger.warn(
      '"NG_BUILD_IVY_LEGACY" environment variable detected. Using legacy Ivy build system.',
    );

    return false;
  }

  // Lazy modules option uses the deprecated string format for lazy routes
  if (wco.buildOptions.lazyModules && wco.buildOptions.lazyModules.length > 0) {
    return false;
  }

  // This pass relies on internals of the original plugin
  if (wco.buildOptions.experimentalRollupPass) {
    return false;
  }

  return true;
}

function createIvyPlugin(
  wco: WebpackConfigOptions,
  aot: boolean,
  tsconfig: string,
): ivy.AngularWebpackPlugin {
  const { buildOptions } = wco;
  const optimize = buildOptions.optimization.scripts;

  const compilerOptions: CompilerOptions = {
    skipTemplateCodegen: !aot,
    sourceMap: buildOptions.sourceMap.scripts,
  };

  if (buildOptions.preserveSymlinks !== undefined) {
    compilerOptions.preserveSymlinks = buildOptions.preserveSymlinks;
  }

  const fileReplacements: Record<string, string> = {};
  if (buildOptions.fileReplacements) {
    for (const replacement of buildOptions.fileReplacements) {
      fileReplacements[getSystemPath(replacement.replace)] = getSystemPath(replacement.with);
    }
  }

  return new ivy.AngularWebpackPlugin({
    tsconfig,
    compilerOptions,
    fileReplacements,
    emitNgModuleScope: !optimize,
    suppressZoneJsIncompatibilityWarning: true,
  });
}

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
  options: AngularCompilerPluginOptions,
  i18nExtract = false,
) {
  const { root, buildOptions } = wco;

  const i18nInFile = buildOptions.i18nFile
    ? path.resolve(root, buildOptions.i18nFile)
    : undefined;

  const i18nFileAndFormat = i18nExtract
    ? {
      i18nOutFile: buildOptions.i18nFile,
      i18nOutFormat: buildOptions.i18nFormat,
    } : {
      i18nInFile: i18nInFile,
      i18nInFormat: buildOptions.i18nFormat,
    };

  const compilerOptions = options.compilerOptions || {};
  if (i18nExtract) {
    // Extraction of i18n is still using the legacy VE pipeline
    compilerOptions.enableIvy = false;
  }

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
    mainPath: path.join(root, buildOptions.main),
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
    compilerOptions,
    suppressZoneJsIncompatibilityWarning: true,
  };

  pluginOptions = _pluginOptionsOverrides(buildOptions, pluginOptions);

  return new AngularCompilerPlugin(pluginOptions);
}

export function getNonAotConfig(wco: WebpackConfigOptions) {
  const { tsConfigPath } = wco;
  const useIvyOnlyPlugin = canUseIvyPlugin(wco);

  return {
    module: {
      rules: [
        {
          test: useIvyOnlyPlugin ? /\.[jt]sx?$/ : /\.tsx?$/,
          loader: useIvyOnlyPlugin
            ? ivy.AngularWebpackLoaderPath
            : NgToolsLoader,
        },
      ],
    },
    plugins: [
      useIvyOnlyPlugin
        ? createIvyPlugin(wco, false, tsConfigPath)
        : _createAotPlugin(wco, { tsConfigPath, skipCodeGeneration: true }),
    ],
  };
}

export function getAotConfig(wco: WebpackConfigOptions, i18nExtract = false) {
  const { tsConfigPath, buildOptions } = wco;
  const optimize = buildOptions.optimization.scripts;
  const useIvyOnlyPlugin = canUseIvyPlugin(wco) && !i18nExtract;

  let buildOptimizerRules: RuleSetLoader[] = [];
  if (buildOptions.buildOptimizer) {
    buildOptimizerRules = [{
      loader: buildOptimizerLoaderPath,
      options: { sourceMap: buildOptions.sourceMap.scripts }
    }];
  }

  return {
    module: {
      rules: [
        {
          test: useIvyOnlyPlugin ? /\.tsx?$/ : /(?:\.ngfactory\.js|\.ngstyle\.js|\.tsx?)$/,
          use: [
            ...buildOptimizerRules,
            useIvyOnlyPlugin ? ivy.AngularWebpackLoaderPath : NgToolsLoader,
          ],
        },
        // "allowJs" support with ivy plugin - ensures build optimizer is not run twice
        ...(useIvyOnlyPlugin
          ? [
              {
                test: /\.jsx?$/,
                use: [ivy.AngularWebpackLoaderPath],
              },
            ]
          : []),
      ],
    },
    plugins: [
      useIvyOnlyPlugin
        ? createIvyPlugin(wco, true, tsConfigPath)
        : _createAotPlugin(
            wco,
            { tsConfigPath, emitClassMetadata: !optimize, emitNgModuleScope: !optimize },
            i18nExtract,
          ),
    ],
  };
}

export function getTypescriptWorkerPlugin(wco: WebpackConfigOptions, workerTsConfigPath: string) {
  if (canUseIvyPlugin(wco)) {
    return createIvyPlugin(wco, false, workerTsConfigPath);
  }

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
