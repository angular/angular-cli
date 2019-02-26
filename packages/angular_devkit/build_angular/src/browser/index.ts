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
import { Path, getSystemPath, join, normalize, resolve, virtualFs } from '@angular-devkit/core';
import * as fs from 'fs';
import { Observable, concat, of, throwError } from 'rxjs';
import { concatMap, last } from 'rxjs/operators';
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
import { NormalizedBrowserBuilderSchema, defaultProgress, normalizeBrowserSchema } from '../utils';
import { Schema as BrowserBuilderSchema } from './schema';
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const webpackMerge = require('webpack-merge');

export class BrowserBuilder implements Builder<BrowserBuilderSchema> {

  constructor(public context: BuilderContext) { }

  protected createWebpackBuilder(context: BuilderContext): WebpackBuilder {
    return new WebpackBuilder(context);
  }

  protected createLoggingFactory(): (verbose: boolean) => LoggingCallback  {
    return getBrowserLoggingCb;
  }

  run(builderConfig: BuilderConfiguration<BrowserBuilderSchema>): Observable<BuildEvent> {
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
    const webpackBuilder = this.createWebpackBuilder({ ...this.context, host });
    const getLoggingCb = this.createLoggingFactory();

    const options = normalizeBrowserSchema(
      host,
      root,
      resolve(root, builderConfig.root),
      builderConfig.sourceRoot,
      builderConfig.options,
    );

    return of(null).pipe(
      concatMap(() => options.deleteOutputPath
        ? this._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
        : of(null)),
      concatMap(() => {
        let webpackConfig;
        try {
          webpackConfig = this.buildWebpackConfig(root, projectRoot, host, options);
        } catch (e) {
          return throwError(e);
        }

        return webpackBuilder.runWebpack(webpackConfig, getLoggingCb(options.verbose || false));
      }),
      concatMap(buildEvent => {
        if (buildEvent.success && !options.watch && options.serviceWorker) {
          return new Observable<BuildEvent>(obs => {
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
    // Ensure Build Optimizer is only used with AOT.
    if (options.buildOptimizer && !options.aot) {
      throw new Error(`The 'buildOptimizer' option cannot be used without 'aot'.`);
    }

    let wco: WebpackConfigOptions<NormalizedBrowserBuilderSchema>;

    const tsConfigPath = getSystemPath(normalize(resolve(root, normalize(options.tsConfig))));
    const tsConfig = readTsconfig(tsConfigPath);

    const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
      && tsConfig.options.target !== projectTs.ScriptTarget.ES5;

    wco = {
      root: getSystemPath(root),
      logger: this.context.logger,
      projectRoot: getSystemPath(projectRoot),
      buildOptions: options,
      tsConfig,
      tsConfigPath,
      supportES2015,
    };

    wco.buildOptions.progress = defaultProgress(wco.buildOptions.progress);

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

    const webpackConfig = webpackMerge(webpackConfigs);

    if (options.profile) {
      const smp = new SpeedMeasurePlugin({
        outputFormat: 'json',
        outputTarget: getSystemPath(join(root, 'speed-measure-plugin.json')),
      });

      return smp.wrap(webpackConfig);
    }

    return webpackConfig;
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
