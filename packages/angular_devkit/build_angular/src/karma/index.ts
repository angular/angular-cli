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
import { KarmaBuilder as BaseKarmaBuilder } from '@angular-devkit/build-karma';
import { Path, getSystemPath, normalize, resolve, virtualFs } from '@angular-devkit/core';
import * as fs from 'fs';
import { Observable, of } from 'rxjs';
import { concatMap, tap } from 'rxjs/operators';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
import {
  getCommonConfig,
  getNonAotTestConfig,
  getStylesConfig,
  getTestConfig,
} from '../angular-cli-files/models/webpack-configs';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import { AssetPatternObject, CurrentFileReplacement } from '../browser/schema';
import { addFileReplacements, normalizeAssetPatterns } from '../utils';
import { KarmaBuilderSchema } from './schema';
const webpackMerge = require('webpack-merge');


export interface NormalizedKarmaBuilderSchema extends KarmaBuilderSchema {
  assets: AssetPatternObject[];
  fileReplacements: CurrentFileReplacement[];
}

export class KarmaBuilder implements Builder<KarmaBuilderSchema> {
  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<KarmaBuilderSchema>): Observable<BuildEvent> {
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
    const baseKarmaBuilder = new BaseKarmaBuilder({ ...this.context, host });

    return of(null).pipe(
      concatMap(() => addFileReplacements(root, host, options.fileReplacements)),
      concatMap(() => normalizeAssetPatterns(
        options.assets, host, root, projectRoot, builderConfig.sourceRoot)),
      // Replace the assets in options with the normalized version.
      tap((assetPatternObjects => options.assets = assetPatternObjects)),
      concatMap(() => {
        const karmaConfig = getSystemPath(resolve(root, normalize(options.karmaConfig)));

        // TODO: adjust options to account for not passing them blindly to karma.
        // const karmaOptions: any = Object.assign({}, options);
        // tslint:disable-next-line:no-any
        const karmaOptions: any = {};

        if (options.watch !== undefined) {
          karmaOptions.singleRun = !options.watch;
        }

        // Convert browsers from a string to an array
        if (options.browsers) {
          karmaOptions.browsers = options.browsers.split(',');
        }

        karmaOptions.buildWebpack = {
          root: getSystemPath(root),
          projectRoot: getSystemPath(projectRoot),
          options: options as NormalizedKarmaBuilderSchema,
          webpackConfig: this._buildWebpackConfig(root, projectRoot, host,
            options as NormalizedKarmaBuilderSchema),
        };

        // TODO: inside the configs, always use the project root and not the workspace root.
        // Until then we pretend the app root is relative (``) but the same as `projectRoot`.
        (karmaOptions.buildWebpack.options as any).root = ''; // tslint:disable-line:no-any

        // Assign additional karmaConfig options to the local ngapp config
        karmaOptions.configFile = karmaConfig;

        // Run the Karma builder with the modified options.
        return baseKarmaBuilder.runKarma(karmaOptions);
      }),
    );
  }

  private _buildWebpackConfig(
    root: Path,
    projectRoot: Path,
    host: virtualFs.Host<fs.Stats>,
    options: NormalizedKarmaBuilderSchema,
  ) {
    let wco: WebpackConfigOptions;

    const tsConfigPath = getSystemPath(resolve(root, normalize(options.tsConfig as string)));
    const tsConfig = readTsconfig(tsConfigPath);

    const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;

    const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
      && tsConfig.options.target !== projectTs.ScriptTarget.ES5;

    const compatOptions: typeof wco['buildOptions'] = {
      ...options as {} as typeof wco['buildOptions'],
      // Some asset logic inside getCommonConfig needs outputPath to be set.
      outputPath: '',
    };

    wco = {
      root: getSystemPath(root),
      projectRoot: getSystemPath(projectRoot),
      // TODO: use only this.options, it contains all flags and configs items already.
      buildOptions: compatOptions,
      tsConfig,
      tsConfigPath,
      supportES2015,
    };

    const webpackConfigs: {}[] = [
      getCommonConfig(wco),
      getStylesConfig(wco),
      getNonAotTestConfig(wco, host),
      getTestConfig(wco),
    ];

    return webpackMerge(webpackConfigs);
  }
}

export default KarmaBuilder;
