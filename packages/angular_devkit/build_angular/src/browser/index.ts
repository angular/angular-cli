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
import { Path, getSystemPath, normalize, resolve, virtualFs } from '@angular-devkit/core';
import * as fs from 'fs';
import { Observable, concat, of } from 'rxjs';
import { concatMap, last } from 'rxjs/operators';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import * as webpack from 'webpack';
import {
  getAotConfig,
  getBrowserConfig,
  getCommonConfig,
  getNonAotConfig,
  getStylesConfig,
} from '../angular-cli-files/models/webpack-configs';
import { getWebpackStatsConfig } from '../angular-cli-files/models/webpack-configs/utils';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import { augmentAppWithServiceWorker } from '../angular-cli-files/utilities/service-worker';
import {
  statsErrorsToString,
  statsToString,
  statsWarningsToString,
} from '../angular-cli-files/utilities/stats';
import { addFileReplacements } from '../utils';
import { BrowserBuilderSchema } from './schema';
const webpackMerge = require('webpack-merge');


export interface WebpackConfigOptions {
  root: string;
  projectRoot: string;
  buildOptions: BrowserBuilderSchema;
  tsConfig: ts.ParsedCommandLine;
  tsConfigPath: string;
  supportES2015: boolean;
}

export class BrowserBuilder implements Builder<BrowserBuilderSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<BrowserBuilderSchema>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);

    return of(null).pipe(
      concatMap(() => options.deleteOutputPath
        ? this._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
        : of(null)),
      concatMap(() => addFileReplacements(root, host, options.fileReplacements)),
      concatMap(() => new Observable(obs => {
        // Ensure Build Optimizer is only used with AOT.
        if (options.buildOptimizer && !options.aot) {
          throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
        }

        let webpackConfig;
        try {
          webpackConfig = this.buildWebpackConfig(root, projectRoot, host, options);
        } catch (e) {
          obs.error(e);

          return;
        }
        const webpackCompiler = webpack(webpackConfig);
        const statsConfig = getWebpackStatsConfig(options.verbose);

        const callback: webpack.compiler.CompilerCallback = (err, stats) => {
          if (err) {
            return obs.error(err);
          }

          const json = stats.toJson(statsConfig);
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

          if (options.watch) {
            obs.next({ success: !stats.hasErrors() });

            // Never complete on watch mode.
            return;
          } else {
            if (builderConfig.options.serviceWorker) {
              augmentAppWithServiceWorker(
                this.context.host,
                root,
                projectRoot,
                resolve(root, normalize(options.outputPath)),
                options.baseHref || '/',
                options.ngswConfigPath,
              ).then(
                () => {
                  obs.next({ success: !stats.hasErrors() });
                  obs.complete();
                },
                (err: Error) => {
                  // We error out here because we're not in watch mode anyway (see above).
                  obs.error(err);
                },
              );
            } else {
              obs.next({ success: !stats.hasErrors() });
              obs.complete();
            }
          }
        };

        try {
          if (options.watch) {
            const watching = webpackCompiler.watch({ poll: options.poll }, callback);

            // Teardown logic. Close the watcher when unsubscribed from.
            return () => watching.close(() => { });
          } else {
            webpackCompiler.run(callback);
          }
        } catch (err) {
          if (err) {
            this.context.logger.error(
              '\nAn error occured during the build:\n' + ((err && err.stack) || err));
          }
          throw err;
        }
      })),
    );
  }

  buildWebpackConfig(
    root: Path,
    projectRoot: Path,
    host: virtualFs.Host<fs.Stats>,
    options: BrowserBuilderSchema,
  ) {
    let wco: WebpackConfigOptions;

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

export default BrowserBuilder;
