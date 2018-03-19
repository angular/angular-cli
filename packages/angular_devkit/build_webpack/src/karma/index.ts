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
import { Observable } from 'rxjs/Observable';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import {
  getCommonConfig,
  getNonAotTestConfig,
  getStylesConfig,
  getTestConfig,
} from '../angular-cli-files/models/webpack-configs';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import {
  AssetPattern,
  ExtraEntryPoint,
} from '../browser';
const webpackMerge = require('webpack-merge');


export interface KarmaBuilderOptions {
  main: string;
  tsConfig: string; // previously 'tsconfig'.
  karmaConfig: string; // previously 'config'.
  watch: boolean;
  codeCoverage: boolean;
  codeCoverageExclude: string[];
  progress: boolean;
  preserveSymlinks?: boolean;

  // Options with no defaults.
  polyfills?: string;
  poll?: number;
  port?: number;
  browsers?: string;

  // A couple of options have different names.
  sourceMap: boolean; // previously 'sourcemaps'.

  // These options were not available as flags.
  assets: AssetPattern[];
  scripts: ExtraEntryPoint[];
  styles: ExtraEntryPoint[];
  stylePreprocessorOptions: { includePaths: string[] };

  // Some options are not needed anymore.
  // app?: string; // apps aren't used with build facade
  // singleRun?: boolean; // same as watch
  // colors: boolean; // we just passed it to the karma config
  // logLevel?: string; // same as above
  // reporters?: string; // same as above

  // TODO: figure out what to do about these.
  environment?: string; // Maybe replace with 'fileReplacement' object?
}

export class KarmaBuilder implements Builder<KarmaBuilderOptions> {
  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<KarmaBuilderOptions>): Observable<BuildEvent> {

    // const root = getSystemPath(builderConfig.root);
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);

    return new Observable(obs => {
      const karma = requireProjectModule(getSystemPath(projectRoot), 'karma');
      const karmaConfig = getSystemPath(resolve(root, normalize(options.karmaConfig)));

      // TODO: adjust options to account for not passing them blindly to karma.
      // const karmaOptions: any = Object.assign({}, options);
      // tslint:disable-next-line:no-any
      const karmaOptions: any = {
        singleRun: !options.watch,
      };

      // Convert browsers from a string to an array
      if (options.browsers) {
        karmaOptions.browsers = options.browsers.split(',');
      }

      karmaOptions.buildWebpack = {
        root: getSystemPath(root),
        projectRoot: getSystemPath(projectRoot),
        options: options,
        webpackConfig: this._buildWebpackConfig(root, projectRoot, options),
        // Pass onto Karma to emit BuildEvents.
        successCb: () => obs.next({ success: true }),
        failureCb: () => obs.next({ success: false }),
      };

      // TODO: inside the configs, always use the project root and not the workspace root.
      // Until then we pretend the app root is relative (``) but the same as `projectRoot`.
      (karmaOptions.buildWebpack.options as any).root = ''; // tslint:disable-line:no-any

      // Assign additional karmaConfig options to the local ngapp config
      karmaOptions.configFile = karmaConfig;

      // Complete the observable once the Karma server returns.
      const karmaServer = new karma.Server(karmaOptions, () => obs.complete());
      karmaServer.start();

      // Cleanup, signal Karma to exit.
      return () => {
        // Karma does not seem to have a way to exit the server gracefully.
        // See https://github.com/karma-runner/karma/issues/2867#issuecomment-369912167
        // TODO: make a PR for karma to add `karmaServer.close(code)`, that
        // calls `disconnectBrowsers(code);`
        // karmaServer.close();
      };
    });
  }

  private _buildWebpackConfig(root: Path, projectRoot: Path, options: KarmaBuilderOptions) {
    // tslint:disable-next-line:no-any
    let wco: any;

    const tsconfigPath = getSystemPath(resolve(root, normalize(options.tsConfig as string)));
    const tsConfig = readTsconfig(tsconfigPath);

    const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
      && tsConfig.options.target !== projectTs.ScriptTarget.ES5;

    const compatOptions = {
      ...options,
      // TODO: inside the configs, always use the project root and not the workspace root.
      // Until then we have to pretend the app root is relative (``) but the same as `projectRoot`.
      root: '',
      // Some asset logic inside getCommonConfig needs outputPath to be set.
      outputPath: '',
    };

    wco = {
      root: getSystemPath(root),
      projectRoot: getSystemPath(projectRoot),
      // TODO: use only this.options, it contains all flags and configs items already.
      buildOptions: compatOptions,
      appConfig: compatOptions,
      tsConfig,
      supportES2015,
    };

    const webpackConfigs: {}[] = [
      getCommonConfig(wco),
      getStylesConfig(wco),
      getNonAotTestConfig(wco, this.context.host as virtualFs.Host<fs.Stats>),
      getTestConfig(wco),
    ];

    return webpackMerge(webpackConfigs);
  }
}

export default KarmaBuilder;
