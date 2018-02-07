/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuildEvent, Builder, BuilderContext, Target } from '@angular-devkit/architect';
import { getSystemPath } from '@angular-devkit/core';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { Observable } from 'rxjs/Observable';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import * as webpack from 'webpack';
import {
  getAotConfig,
  getBrowserConfig,
  getCommonConfig,
  getDevConfig,
  getNonAotConfig,
  getProdConfig,
  getStylesConfig,
} from '../angular-cli-files/models/webpack-configs';
import { getWebpackStatsConfig } from '../angular-cli-files/models/webpack-configs/utils';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import {
  statsErrorsToString,
  statsToString,
  statsWarningsToString,
} from '../angular-cli-files/utilities/stats';
const webpackMerge = require('webpack-merge');


// TODO: Use quicktype to build our TypeScript interfaces from the JSON Schema itself, in
// the build system.
export interface BrowserBuilderOptions {
  outputPath: string;
  index: string;
  main: string;
  tsConfig: string; // previously 'tsconfig'.
  aot: boolean;
  vendorChunk: boolean;
  commonChunk: boolean;
  verbose: boolean;
  progress: boolean;
  extractCss: boolean;
  bundleDependencies: 'none' | 'all';
  watch: boolean;
  outputHashing: 'none' | 'all' | 'media' | 'bundles';
  deleteOutputPath: boolean;
  preserveSymlinks: boolean;
  extractLicenses: boolean;
  showCircularDependencies: boolean;
  buildOptimizer: boolean;
  namedChunks: boolean;
  subresourceIntegrity: boolean;
  serviceWorker: boolean;
  skipAppShell: boolean;

  // Options with no defaults.
  // TODO: reconsider this list.
  polyfills?: string;
  baseHref?: string;
  deployUrl?: string;
  i18nFile?: string;
  i18nFormat?: string;
  i18nOutFile?: string;
  i18nOutFormat?: string;
  poll?: number;

  // A couple of options have different names.
  sourceMap: boolean; // previously 'sourcemaps'.
  evalSourceMap: boolean; // previously 'evalSourcemaps'.
  optimizationLevel: number; // previously 'target'.
  i18nLocale?: string; // previously 'locale'.
  i18nMissingTranslation?: string; // previously 'missingTranslation'.

  // These options were not available as flags.
  assets: AssetPattern[];
  scripts: ExtraEntryPoint[];
  styles: ExtraEntryPoint[];
  stylePreprocessorOptions: { includePaths: string[] };
  platform: 'browser' | 'server';

  // Some options are not needed anymore.
  // app?: string; // apps aren't used with build facade

  // TODO: figure out what to do about these.
  environment?: string; // Maybe replace with 'fileReplacement' object?
  forceTsCommonjs?: boolean; // Remove with webpack 4.
  statsJson: boolean;
}

export interface AssetPattern {
  glob: string;
  input: string;
  output: string;
  allowOutsideOutDir: boolean;
}

export interface ExtraEntryPoint {
  input: string;
  output?: string;
  lazy: boolean;
}

export interface WebpackConfigOptions {
  projectRoot: string;
  buildOptions: BrowserBuilderOptions;
  appConfig: BrowserBuilderOptions;
  tsConfig: ts.ParsedCommandLine;
  supportES2015: boolean;
}

export class BrowserBuilder implements Builder<BrowserBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(target: Target<BrowserBuilderOptions>): Observable<BuildEvent> {
    return new Observable(obs => {
      const root = getSystemPath(target.root);
      const options = target.options;

      // Ensure Build Optimizer is only used with AOT.
      if (options.buildOptimizer && !options.aot) {
        throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
      }

      if (options.deleteOutputPath) {
        // TODO: do this in a webpack plugin https://github.com/johnagan/clean-webpack-plugin
        // fs.removeSync(resolve(options.root, options.outputPath));
      }

      const webpackConfig = this.buildWebpackConfig(root, options);
      const webpackCompiler = webpack(webpackConfig);
      const statsConfig = getWebpackStatsConfig(options.verbose);

      const callback: webpack.compiler.CompilerCallback = (err, stats) => {
        if (err) {
          return obs.error(err);
        }

        const json = stats.toJson('verbose');
        if (options.verbose) {
          this.context.logger.info(stats.toString(statsConfig));
        } else {
          this.context.logger.info(statsToString(json, statsConfig));
        }

        if (stats.hasWarnings()) {
          this.context.logger.warn(statsWarningsToString(json, statsConfig));
        }
        if (stats.hasErrors()) {
          this.context.logger.error(statsErrorsToString(json, statsConfig));
        }

        // TODO: what should these events look like and contain?
        obs.next({ success: true });

        if (options.watch) {
          return;
        } else if (options.statsJson) {
          writeFileSync(
            resolve(root, options.outputPath, 'stats.json'),
            JSON.stringify(stats.toJson(), null, 2),
          );
        }

        if (stats.hasErrors()) {
          obs.error();
        } else {
          // if (!!app.serviceWorker && runTaskOptions.target === 'production' &&
          //   usesServiceWorker(this.project.root) && runTaskOptions.serviceWorker !== false) {
          //   const appRoot = path.resolve(this.project.root, app.root);
          //   augmentAppWithServiceWorker(this.project.root, appRoot, path.resolve(outputPath),
          //     runTaskOptions.baseHref || '/')
          //     .then(() => resolve(), (err: any) => reject(err));
          // } else {
          obs.complete();
        }
      };

      try {
        // if (options.watch) {
        //   webpackCompiler.watch({ poll: options.poll }, callback);
        // } else {
        webpackCompiler.run(callback);
        // }
      } catch (err) {
        if (err) {
          this.context.logger.error(
            '\nAn error occured during the build:\n' + ((err && err.stack) || err));
        }
        throw err;
      }
    });
  }

  buildWebpackConfig(projectRoot: string, options: BrowserBuilderOptions) {
    let wco: WebpackConfigOptions;

    // TODO: make target defaults into configurations instead
    // options = this.addTargetDefaults(options);

    const tsconfigPath = resolve(projectRoot, options.tsConfig as string);
    const tsConfig = readTsconfig(tsconfigPath);

    const projectTs = requireProjectModule(projectRoot, 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
      && tsConfig.options.target !== projectTs.ScriptTarget.ES5;


    // TODO: inside the configs, always use the project root and not the workspace root.
    // Until then we have to pretend the app root is relative (``) but the same as `projectRoot`.
    (options as any).root = ''; // tslint:disable-line:no-any

    wco = {
      projectRoot,
      // TODO: use only this.options, it contains all flags and configs items already.
      buildOptions: options,
      appConfig: options,
      tsConfig,
      supportES2015,
    };

    let targetConfig = {};
    switch (options.optimizationLevel) {
      case 0:
        targetConfig = getDevConfig(wco);
        break;
      case 1:
        targetConfig = getProdConfig(wco);
        break;
    }

    const webpackConfigs: {}[] = [
      getCommonConfig(wco),
      getBrowserConfig(wco),
      getStylesConfig(wco),
      // TODO: use project configurations for the --prod meta options.
      targetConfig,
    ];

    if (wco.appConfig.main || wco.appConfig.polyfills) {
      const typescriptConfigPartial = wco.buildOptions.aot
        ? getAotConfig(wco)
        : getNonAotConfig(wco);
      webpackConfigs.push(typescriptConfigPartial);
    }

    return webpackMerge(webpackConfigs);
  }
}

export default BrowserBuilder;
