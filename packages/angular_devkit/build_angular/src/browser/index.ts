/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BuildEvent,
  Builder,
  BuilderConfiguration,
  BuilderContext,
} from '@angular-devkit/architect';
import { LoggingCallback, WebpackBuilder } from '@angular-devkit/build-webpack';
import { Path, getSystemPath, normalize, resolve, virtualFs } from '@angular-devkit/core';
import * as fs from 'fs';
import { Observable, concat, of, throwError } from 'rxjs';
import { concatMap, last, tap } from 'rxjs/operators';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
import {
  getAotConfig,
  getBrowserConfig,
  getCommonConfig,
  getNonAotConfig,
  getStatsConfig,
  getStylesConfig,
} from '../angular-cli-files/models/webpack-configs';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import { augmentAppWithServiceWorker } from '../angular-cli-files/utilities/service-worker';
import {
  statsErrorsToString,
  statsToString,
  statsWarningsToString,
} from '../angular-cli-files/utilities/stats';
import { addFileReplacements, normalizeAssetPatterns } from '../utils';
import { AssetPatternObject, BrowserBuilderSchema, CurrentFileReplacement } from './schema';
const webpackMerge = require('webpack-merge');


// TODO: figure out a better way to normalize assets, extra entry points, file replacements,
// and whatever else needs to be normalized, while keeping type safety.
// Right now this normalization has to be done in all other builders that make use of the
// BrowserBuildSchema and BrowserBuilder.buildWebpackConfig.
// It would really help if it happens during architect.validateBuilderOptions, or similar.
export interface NormalizedBrowserBuilderSchema extends BrowserBuilderSchema {
  assets: AssetPatternObject[];
  fileReplacements: CurrentFileReplacement[];
}

export class BrowserBuilder implements Builder<BrowserBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<BrowserBuilderSchema>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
    const webpackBuilder = new WebpackBuilder({ ...this.context, host });

    return of(null).pipe(
      concatMap(() => options.deleteOutputPath
        ? this._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
        : of(null)),
      concatMap(() => addFileReplacements(root, host, options.fileReplacements)),
      concatMap(() => normalizeAssetPatterns(
        options.assets, host, root, projectRoot, builderConfig.sourceRoot)),
      // Replace the assets in options with the normalized version.
      tap((assetPatternObjects => options.assets = assetPatternObjects)),
      concatMap(() => {
        // Ensure Build Optimizer is only used with AOT.
        if (options.buildOptimizer && !options.aot) {
          throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
        }

        let webpackConfig;
        try {
          webpackConfig = this.buildWebpackConfig(root, projectRoot, host,
            options as NormalizedBrowserBuilderSchema);
        } catch (e) {
          return throwError(e);
        }

        return webpackBuilder.runWebpack(webpackConfig, getBrowserLoggingCb(options.verbose));
      }),
      concatMap(buildEvent => {
        if (buildEvent.success && !options.watch && options.serviceWorker) {
          return new Observable(obs => {
            augmentAppWithServiceWorker(
              this.context.host,
              root,
              projectRoot,
              resolve(root, normalize(options.outputPath)),
              options.baseHref || '/',
              options.ngswConfigPath,
            ).then(
              () => {
                obs.next({ success: true });
                obs.complete();
              },
              (err: Error) => {
                obs.error(err);
              },
            );
          });
        } else {
          return of(buildEvent);
        }
      }),
    );
  }

  buildWebpackConfig(
    root: Path,
    projectRoot: Path,
    host: virtualFs.Host<fs.Stats>,
    options: NormalizedBrowserBuilderSchema,
  ) {
    let wco: WebpackConfigOptions<NormalizedBrowserBuilderSchema>;

    const tsConfigPath = getSystemPath(normalize(resolve(root, normalize(options.tsConfig))));
    const tsConfig = readTsconfig(tsConfigPath);

    const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
      && tsConfig.options.target !== projectTs.ScriptTarget.ES5;

    wco = {
      root: getSystemPath(root),
      projectRoot: getSystemPath(projectRoot),
      buildOptions: options,
      tsConfig,
      tsConfigPath,
      supportES2015,
    };

    const webpackConfigs: {}[] = [
      getCommonConfig(wco),
      getBrowserConfig(wco),
      getStylesConfig(wco),
      getStatsConfig(wco),
    ];

    if (wco.buildOptions.main || wco.buildOptions.polyfills) {
      const typescriptConfigPartial = wco.buildOptions.aot
        ? getAotConfig(wco, host)
        : getNonAotConfig(wco, host);
      webpackConfigs.push(typescriptConfigPartial);
    }

    return webpackMerge(webpackConfigs);
  }

  private _deleteOutputDir(root: Path, outputPath: Path, host: virtualFs.Host) {
    const resolvedOutputPath = resolve(root, outputPath);
    if (resolvedOutputPath === root) {
      throw new Error('Output path MUST not be project root directory!');
    }

    return host.exists(resolvedOutputPath).pipe(
      concatMap(exists => exists
        // TODO: remove this concat once host ops emit an event.
        ? concat(host.delete(resolvedOutputPath), of(null)).pipe(last())
        // ? of(null)
        : of(null)),
    );
  }
}

export const getBrowserLoggingCb = (verbose: boolean): LoggingCallback =>
  (stats, config, logger) => {
    // config.stats contains our own stats settings, added during buildWebpackConfig().
    const json = stats.toJson(config.stats);
    if (verbose) {
      logger.info(stats.toString(config.stats));
    } else {
      logger.info(statsToString(json, config.stats));
    }

    if (stats.hasWarnings()) {
      logger.warn(statsWarningsToString(json, config.stats));
    }
    if (stats.hasErrors()) {
      logger.error(statsErrorsToString(json, config.stats));
    }
  };

export default BrowserBuilder;
