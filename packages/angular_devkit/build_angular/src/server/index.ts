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
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { concat, concatMap } from 'rxjs/operators';
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
import { BuildWebpackServerSchema } from './schema';
const webpackMerge = require('webpack-merge');


export class ServerBuilder implements Builder<BuildWebpackServerSchema> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<BuildWebpackServerSchema>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);

    // TODO: verify using of(null) to kickstart things is a pattern.
    return of(null).pipe(
      concatMap(() => options.deleteOutputPath
        ? this._deleteOutputDir(root, normalize(options.outputPath))
        : of(null)),
      concatMap(() => new Observable(obs => {
        // Ensure Build Optimizer is only used with AOT.
        let webpackConfig;
        try {
          webpackConfig = this.buildWebpackConfig(root, projectRoot, options);
        } catch (e) {
          // TODO: why do I have to catch this error? I thought throwing inside an observable
          // always got converted into an error.
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

  buildWebpackConfig(root: Path, projectRoot: Path, options: BuildWebpackServerSchema) {
    let wco: WebpackConfigOptions;

    // TODO: make target defaults into configurations instead
    // options = this.addTargetDefaults(options);

    const tsconfigPath = normalize(resolve(root, normalize(options.tsConfig as string)));
    const tsConfig = readTsconfig(getSystemPath(tsconfigPath));

    const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
      && tsConfig.options.target !== projectTs.ScriptTarget.ES5;


    // TODO: inside the configs, always use the project root and not the workspace root.
    // Until then we have to pretend the app root is relative (``) but the same as `projectRoot`.
    (options as any).root = ''; // tslint:disable-line:no-any

    const buildOptions: typeof wco['buildOptions'] = {
      ...options as {} as typeof wco['buildOptions'],
      aot: true,
    };

    wco = {
      root: getSystemPath(root),
      projectRoot: getSystemPath(projectRoot),
      // TODO: use only this.options, it contains all flags and configs items already.
      buildOptions,
      appConfig: {
        ...options,
        platform: 'server',
        scripts: [],
        styles: [],
      },
      tsConfig,
      supportES2015,
    };

    const webpackConfigs: {}[] = [
      getCommonConfig(wco),
      getServerConfig(wco),
      getStylesConfig(wco),
    ];

    if (wco.appConfig.main || wco.appConfig.polyfills) {
      const typescriptConfigPartial = wco.buildOptions.aot
        ? getAotConfig(wco, this.context.host as virtualFs.Host<Stats>)
        : getNonAotConfig(wco, this.context.host as virtualFs.Host<Stats>);
      webpackConfigs.push(typescriptConfigPartial);
    }

    return webpackMerge(webpackConfigs);
  }

  private _deleteOutputDir(root: Path, outputPath: Path) {
    const resolvedOutputPath = resolve(root, outputPath);
    if (resolvedOutputPath === root) {
      throw new Error('Output path MUST not be project root directory!');
    }

    return this.context.host.exists(resolvedOutputPath).pipe(
      concatMap(exists => exists
        // TODO: remove this concat once host ops emit an event.
        ? this.context.host.delete(resolvedOutputPath).pipe(concat(of(null)))
        // ? of(null)
        : of(null)),
    );
  }
}

export default ServerBuilder;
