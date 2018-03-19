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
import { resolve } from '@angular-devkit/core';
import * as path from 'path';
import { Observable } from 'rxjs/Observable';
import { concatMap, map } from 'rxjs/operators';
import * as webpack from 'webpack';
import { getWebpackStatsConfig } from '../angular-cli-files/models/webpack-configs/utils';
import { statsErrorsToString, statsWarningsToString } from '../angular-cli-files/utilities/stats';
import { BrowserBuilder, BrowserBuilderOptions } from '../browser';
const MemoryFS = require('memory-fs');


export interface ExtractI18nBuilderOptions {
  browserTarget: string;
  i18nFormat: string;
  i18nLocale: string;
  outputPath?: string;
  outFile?: string;
}

export class ExtractI18nBuilder implements Builder<ExtractI18nBuilderOptions> {

  constructor(public context: BuilderContext) { }

  run(builderConfig: BuilderConfiguration<ExtractI18nBuilderOptions>): Observable<BuildEvent> {
    const architect = this.context.architect;
    const options = builderConfig.options;
    const root = this.context.workspace.root;
    const projectRoot = resolve(root, builderConfig.root);
    const [project, targetName, configuration] = options.browserTarget.split(':');
    // Override browser build watch setting.
    const overrides = { watch: false };

    const browserTargetSpec = { project, target: targetName, configuration, overrides };
    const browserBuilderConfig = architect.getBuilderConfiguration<BrowserBuilderOptions>(
      browserTargetSpec);

    return architect.getBuilderDescription(browserBuilderConfig).pipe(
      concatMap(browserDescription =>
        architect.validateBuilderOptions(browserBuilderConfig, browserDescription)),
      map(browserBuilderConfig => browserBuilderConfig.options),
      concatMap((validatedBrowserOptions) => new Observable(obs => {
        const browserOptions = validatedBrowserOptions;
        const browserBuilder = new BrowserBuilder(this.context);

        // We need to determine the outFile name so that AngularCompiler can retrieve it.
        let outFile = options.outFile || getI18nOutfile(options.i18nFormat);
        if (options.outputPath) {
          // AngularCompilerPlugin doesn't support genDir so we have to adjust outFile instead.
          outFile = path.join(options.outputPath, outFile);
        }

        // Extracting i18n uses the browser target webpack config with some specific options.
        const webpackConfig = browserBuilder.buildWebpackConfig(root, projectRoot, {
          ...browserOptions,
          optimizationLevel: 0,
          i18nLocale: options.i18nLocale,
          i18nOutFormat: options.i18nFormat,
          i18nOutFile: outFile,
          aot: true,
        });

        const webpackCompiler = webpack(webpackConfig);
        webpackCompiler.outputFileSystem = new MemoryFS();
        const statsConfig = getWebpackStatsConfig();

        const callback: webpack.compiler.CompilerCallback = (err, stats) => {
          if (err) {
            return obs.error(err);
          }

          const json = stats.toJson('verbose');
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
              '\nAn error occured during the extraction:\n' + ((err && err.stack) || err));
          }
          throw err;
        }
      })),
    );
  }
}

function getI18nOutfile(format: string) {
  switch (format) {
    case 'xmb':
      return 'messages.xmb';
    case 'xlf':
    case 'xlif':
    case 'xliff':
    case 'xlf2':
    case 'xliff2':
      return 'messages.xlf';
    default:
      throw new Error(`Unsupported format "${format}"`);
  }
}

export default ExtractI18nBuilder;
