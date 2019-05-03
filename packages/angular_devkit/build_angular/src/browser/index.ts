/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
} from '@angular-devkit/architect';
import { BuildResult, WebpackLoggingCallback, runWebpack } from '@angular-devkit/build-webpack';
import {
  experimental,
  getSystemPath,
  join,
  json,
  logging,
  normalize,
  resolve,
  tags,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import * as fs from 'fs';
import * as path from 'path';
import { from, of } from 'rxjs';
import { bufferCount, catchError, concatMap, map, mergeScan, switchMap } from 'rxjs/operators';
import { ScriptTarget } from 'typescript';
import * as webpack from 'webpack';
import { NgBuildAnalyticsPlugin } from '../../plugins/webpack/analytics';
import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
import {
  getAotConfig,
  getBrowserConfig,
  getCommonConfig,
  getNonAotConfig,
  getStatsConfig,
  getStylesConfig,
  getWorkerConfig,
} from '../angular-cli-files/models/webpack-configs';
import { writeIndexHtml } from '../angular-cli-files/utilities/index-file/write-index-html';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { augmentAppWithServiceWorker } from '../angular-cli-files/utilities/service-worker';
import {
  statsErrorsToString,
  statsToString,
  statsWarningsToString,
} from '../angular-cli-files/utilities/stats';
import { ExecutionTransformer } from '../transforms';
import { deleteOutputDir, isEs5SupportNeeded } from '../utils';
import { Version } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import { Schema as BrowserBuilderSchema } from './schema';

export type BrowserBuilderOutput = json.JsonObject & BuilderOutput & {
  outputPath: string;
};

export function createBrowserLoggingCallback(
  verbose: boolean,
  logger: logging.LoggerApi,
): WebpackLoggingCallback {
  return (stats, config) => {
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
}

export async function buildBrowserWebpackConfigFromContext(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  host: virtualFs.Host<fs.Stats> = new NodeJsSyncHost(),
): Promise<{ workspace: experimental.workspace.Workspace, config: webpack.Configuration[] }> {
  return generateBrowserWebpackConfigFromContext(
    options,
    context,
    wco => [
      getCommonConfig(wco),
      getBrowserConfig(wco),
      getStylesConfig(wco),
      getStatsConfig(wco),
      getAnalyticsConfig(wco, context),
      getCompilerConfig(wco),
      wco.buildOptions.webWorkerTsConfig ? getWorkerConfig(wco) : {},
    ],
    host,
  );
}

function getAnalyticsConfig(
  wco: WebpackConfigOptions,
  context: BuilderContext,
): webpack.Configuration {
  if (context.analytics) {
    // If there's analytics, add our plugin. Otherwise no need to slow down the build.
    let category = 'build';
    if (context.builder) {
      // We already vetted that this is a "safe" package, otherwise the analytics would be noop.
      category = context.builder.builderName.split(':')[1];
    }

    // The category is the builder name if it's an angular builder.
    return {
      plugins: [
        new NgBuildAnalyticsPlugin(wco.projectRoot, context.analytics, category),
      ],
    };
  }

  return {};
}

function getCompilerConfig(wco: WebpackConfigOptions): webpack.Configuration {
  if (wco.buildOptions.main || wco.buildOptions.polyfills) {
    return wco.buildOptions.aot ? getAotConfig(wco) : getNonAotConfig(wco);
  }

  return {};
}

async function initialize(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  host: virtualFs.Host<fs.Stats>,
  webpackConfigurationTransform?: ExecutionTransformer<webpack.Configuration>,
): Promise<{ workspace: experimental.workspace.Workspace, config: webpack.Configuration[] }> {
  const { config, workspace } = await buildBrowserWebpackConfigFromContext(options, context, host);

  let transformedConfig;
  if (webpackConfigurationTransform) {
    transformedConfig = [];
    for (const c of config) {
      transformedConfig.push(await webpackConfigurationTransform(c));
    }
  }

  if (options.deleteOutputPath) {
    await deleteOutputDir(
      normalize(context.workspaceRoot),
      normalize(options.outputPath),
      host,
    ).toPromise();
  }

  return { config: transformedConfig || config, workspace };
}

export function buildWebpackBrowser(
  options: BrowserBuilderSchema,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>,
    logging?: WebpackLoggingCallback,
  } = {},
) {
  const host = new NodeJsSyncHost();
  const root = normalize(context.workspaceRoot);

  // Check Angular version.
  Version.assertCompatibleAngularVersion(context.workspaceRoot);

  const loggingFn = transforms.logging
    || createBrowserLoggingCallback(!!options.verbose, context.logger);

  return from(initialize(options, context, host, transforms.webpackConfiguration)).pipe(
    switchMap(({ workspace, config: configs }) => {
      const projectName = context.target
        ? context.target.project : workspace.getDefaultProjectName();

      if (!projectName) {
        throw new Error('Must either have a target from the context or a default project.');
      }

      const projectRoot = resolve(
        workspace.root,
        normalize(workspace.getProject(projectName).root),
      );

      const tsConfigPath = path.resolve(getSystemPath(workspace.root), options.tsConfig);
      const tsConfig = readTsconfig(tsConfigPath);

      if (isEs5SupportNeeded(projectRoot) &&
          tsConfig.options.target !== ScriptTarget.ES5 &&
          tsConfig.options.target !== ScriptTarget.ES2015) {
        context.logger.warn(tags.stripIndent`
          WARNING: Using differential loading with targets ES5 and ES2016 or higher may
          cause problems. Browsers with support for ES2015 will load the ES2016+ scripts
          referenced with script[type="module"] but they may not support ES2016+ syntax.
        `);
      }

      return from(configs).pipe(
        // the concurrency parameter (3rd parameter of mergeScan) is deliberately
        // set to 1 to make sure the build steps are executed in sequence.
        mergeScan((lastResult, config) => {
          // Make sure to only run the 2nd build step, if 1st one succeeded
          if (lastResult.success) {
            return runWebpack(config, context, { logging: loggingFn });
          } else {
            return of();
          }
        }, { success: true } as BuildResult, 1),
        bufferCount(configs.length),
        switchMap(buildEvents => {
          const success = buildEvents.every(r => r.success);
          if (success && buildEvents.length === 2 && options.index) {
            const { emittedFiles: ES5BuildFiles = [] } = buildEvents[0];
            const { emittedFiles: ES2015BuildFiles = [] } = buildEvents[1];

            return writeIndexHtml({
              host,
              outputPath: join(root, options.outputPath),
              indexPath: join(root, options.index),
              ES5BuildFiles,
              ES2015BuildFiles,
              baseHref: options.baseHref,
              deployUrl: options.deployUrl,
              sri: options.subresourceIntegrity,
              scripts: options.scripts,
              styles: options.styles,
            })
            .pipe(
              map(() => ({ success: true })),
              catchError(() => of({ success: false })),
            );
          } else {
            return of({ success });
          }
        }),
        concatMap(buildEvent => {
          if (buildEvent.success && !options.watch && options.serviceWorker) {
            return from(augmentAppWithServiceWorker(
              host,
              root,
              projectRoot,
              resolve(root, normalize(options.outputPath)),
              options.baseHref || '/',
              options.ngswConfigPath,
            ).then(() => ({ success: true }), () => ({ success: false })));
          } else {
            return of(buildEvent);
          }
        }),
        map(event => ({
          ...event,
          // If we use differential loading, both configs have the same outputs
          outputPath: path.resolve(context.workspaceRoot, options.outputPath),
        } as BrowserBuilderOutput)),
      );
    }),
  );
}

export default createBuilder<json.JsonObject & BrowserBuilderSchema>(buildWebpackBrowser);
