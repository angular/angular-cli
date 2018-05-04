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
import { Stats } from 'fs';
import { Observable, concat, of } from 'rxjs';
import { concatMap, last } from 'rxjs/operators';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import * as webpack from 'webpack';
import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
import {
  getAotConfig,
  getCommonConfig,
  getNonAotConfig,
  getServerConfig,
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
import { addFileReplacements } from '../utils';
import { BuildWebpackServerSchema } from './schema';
const webpackMerge = require('webpack-merge');


export class ServerBuilder implements Builder<BuildWebpackServerSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<BuildWebpackServerSchema>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<Stats>);

    // TODO: verify using of(null) to kickstart things is a pattern.
    return of(null).pipe(
      concatMap(() => options.deleteOutputPath
        ? this._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
        : of(null)),
      concatMap(() => addFileReplacements(root, host, options.fileReplacements)),
      concatMap(() => new Observable(obs => {
        // Ensure Build Optimizer is only used with AOT.
        const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, options);
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

          obs.next({ success: !stats.hasErrors() });
          obs.complete();
        };

        try {
          webpackCompiler.run(callback);
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

  buildWebpackConfig(root: Path, projectRoot: Path,
                     host: virtualFs.Host<Stats>,
                     options: BuildWebpackServerSchema) {
    let wco: WebpackConfigOptions;

    // TODO: make target defaults into configurations instead
    // options = this.addTargetDefaults(options);

    const tsConfigPath = getSystemPath(normalize(resolve(root, normalize(options.tsConfig))));
    const tsConfig = readTsconfig(tsConfigPath);

    const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
      && tsConfig.options.target !== projectTs.ScriptTarget.ES5;

    const buildOptions: typeof wco['buildOptions'] = {
      ...options as {} as typeof wco['buildOptions'],
    };

    wco = {
      root: getSystemPath(root),
      projectRoot: getSystemPath(projectRoot),
      // TODO: use only this.options, it contains all flags and configs items already.
      buildOptions: {
        ...buildOptions,
        buildOptimizer: false,
        aot: true,
        platform: 'server',
        scripts: [],
        styles: [],
      },
      tsConfig,
      tsConfigPath,
      supportES2015,
    };

    const webpackConfigs: {}[] = [
      getCommonConfig(wco),
      getServerConfig(wco),
      getStylesConfig(wco),
    ];

    if (wco.buildOptions.main || wco.buildOptions.polyfills) {
      const typescriptConfigPartial = wco.buildOptions.aot
        ? getAotConfig(wco, host as virtualFs.Host<Stats>)
        : getNonAotConfig(wco, host as virtualFs.Host<Stats>);
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

export default ServerBuilder;
