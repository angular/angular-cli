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
import { Path, getSystemPath, join, normalize, resolve, virtualFs } from '@angular-devkit/core';
import * as fs from 'fs';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { concat, concatMap } from 'rxjs/operators';
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
  forkTypeChecker: boolean;
  statsJson: boolean;
  lazyModules: string[];

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
  optimization: boolean; // previously 'target'.
  i18nLocale?: string; // previously 'locale'.
  i18nMissingTranslation?: string; // previously 'missingTranslation'.

  // These options were not available as flags.
  assets: AssetPattern[];
  scripts: ExtraEntryPoint[];
  styles: ExtraEntryPoint[];
  stylePreprocessorOptions: { includePaths: string[] };

  fileReplacements: { from: string; to: string; }[];
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
  root: string;
  projectRoot: string;
  buildOptions: BrowserBuilderOptions;
  appConfig: BrowserBuilderOptions;
  tsConfig: ts.ParsedCommandLine;
  supportES2015: boolean;
}

export class BrowserBuilder implements Builder<BrowserBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<BrowserBuilderOptions>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);

    return of(null).pipe(
      concatMap(() => options.deleteOutputPath
        ? this._deleteOutputDir(root, normalize(options.outputPath), this.context.host)
        : of(null)),
      concatMap(() => new Observable(obs => {
        // Ensure Build Optimizer is only used with AOT.
        if (options.buildOptimizer && !options.aot) {
          throw new Error('The `--build-optimizer` option cannot be used without `--aot`.');
        }

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
    options: BrowserBuilderOptions,
  ) {
    let wco: WebpackConfigOptions;

    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);

    options.fileReplacements.forEach(({ from, to }) => {
      host.aliases.set(
        join(root, normalize(from)),
        join(root, normalize(to)),
      );
    });

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

    wco = {
      root: getSystemPath(root),
      projectRoot: getSystemPath(projectRoot),
      // TODO: use only this.options, it contains all flags and configs items already.
      buildOptions: options,
      appConfig: options,
      tsConfig,
      supportES2015,
    };


    // TODO: add the old dev options as the default, and the prod one as a configuration:
    // development: {
    //   environment: 'dev',
    //   outputHashing: 'media',
    //   sourcemaps: true,
    //   extractCss: false,
    //   namedChunks: true,
    //   aot: false,
    //   vendorChunk: true,
    //   buildOptimizer: false,
    // },
    // production: {
    //   environment: 'prod',
    //   outputHashing: 'all',
    //   sourcemaps: false,
    //   extractCss: true,
    //   namedChunks: false,
    //   aot: true,
    //   extractLicenses: true,
    //   vendorChunk: false,
    //   buildOptimizer: buildOptions.aot !== false,
    // }

    const webpackConfigs: {}[] = [
      getCommonConfig(wco),
      getBrowserConfig(wco),
      getStylesConfig(wco),
    ];

    if (wco.appConfig.main || wco.appConfig.polyfills) {
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
        ? host.delete(resolvedOutputPath).pipe(concat(of(null)))
        // ? of(null)
        : of(null)),
    );
  }
}

export default BrowserBuilder;
