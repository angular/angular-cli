/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder, targetFromTargetString } from '@angular-devkit/architect';
import { BrowserBuilderOptions } from '@angular-devkit/build-angular';
import { normalizeOptimization } from '@angular-devkit/build-angular/src/utils/normalize-optimization';
import { augmentAppWithServiceWorker } from '@angular-devkit/build-angular/src/utils/service-worker';
import { normalize, resolve as resolvePath } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { fork } from 'child_process';
import * as fs from 'fs';
import * as ora from 'ora';
import * as path from 'path';
import { promisify } from 'util';
import { PrerenderBuilderOptions, PrerenderBuilderOutput } from './models';
import { getIndexOutputFile, getRoutes, shardArray } from './utils';

export const readFile = promisify(fs.readFile);


type BuildBuilderOutput = BuilderOutput & {
  baseOutputPath: string;
  outputPaths: string[];
  outputPath: string;
};

type ScheduleBuildsOutput = BuilderOutput & {
  serverResult?: BuildBuilderOutput;
  browserResult?: BuildBuilderOutput;
};

/**
 * Schedules the server and browser builds and returns their results if both builds are successful.
 */
async function _scheduleBuilds(
  options: PrerenderBuilderOptions,
  context: BuilderContext
): Promise<ScheduleBuildsOutput> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const serverTarget = targetFromTargetString(options.serverTarget);

  const browserTargetRun = await context.scheduleTarget(browserTarget, {
    watch: false,
    serviceWorker: false,
    // todo: handle service worker augmentation
  });
  const serverTargetRun = await context.scheduleTarget(serverTarget, {
    watch: false,
  });

  try {
    const [browserResult, serverResult] = await Promise.all([
      browserTargetRun.result as unknown as BuildBuilderOutput,
      serverTargetRun.result as unknown as BuildBuilderOutput,
    ]);

    const success =
      browserResult.success && serverResult.success && browserResult.baseOutputPath !== undefined;
    const error = browserResult.error || serverResult.error as string;

    return { success, error, browserResult, serverResult };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    await Promise.all([browserTargetRun.stop(), serverTargetRun.stop()]);
  }
}

/**
 * Renders each route and writes them to
 * <route>/index.html for each output path in the browser result.
 */
async function _renderUniversal(
  routes: string[],
  context: BuilderContext,
  browserResult: BuildBuilderOutput,
  serverResult: BuildBuilderOutput,
  browserOptions: BrowserBuilderOptions,
  numProcesses?: number,
): Promise<PrerenderBuilderOutput> {
  const host = new NodeJsSyncHost();
  const projectName = context.target && context.target.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const root = normalize(context.workspaceRoot);
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = resolvePath(
    root,
    normalize((projectMetadata.root as string) || ''),
  );

  // Users can specify a different base html file e.g. "src/home.html"
  const indexFile = getIndexOutputFile(browserOptions);
  const { styles: normalizedStylesOptimization } = normalizeOptimization(browserOptions.optimization);

  // We need to render the routes for each locale from the browser output.
  for (const outputPath of browserResult.outputPaths) {
    const browserIndexInputPath = path.join(outputPath, indexFile);
    let indexHtml = await readFile(browserIndexInputPath, 'utf8');

    if (normalizedStylesOptimization.inlineCritical) {
      // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
      indexHtml = indexHtml.replace(/ media=\"print\" onload=\"this\.media='all'"><noscript><link .+?><\/noscript>/g, '>');
    }

    const { baseOutputPath = '' } = serverResult;
    const localeDirectory = path.relative(browserResult.baseOutputPath, outputPath);
    const serverBundlePath = path.join(baseOutputPath, localeDirectory, 'main.js');
    if (!fs.existsSync(serverBundlePath)) {
      throw new Error(`Could not find the main bundle: ${serverBundlePath}`);
    }

    const spinner = ora(`Prerendering ${routes.length} route(s) to ${outputPath}...`).start();

    try {
      const workerFile = path.join(__dirname, 'render.js');
      const childProcesses = shardArray(routes, numProcesses)
        .map(routesShard =>
          new Promise((resolve, reject) => {
            fork(workerFile, [
              indexHtml,
              indexFile,
              serverBundlePath,
              outputPath,
              browserOptions.deployUrl || '',
              normalizedStylesOptimization.inlineCritical === true ? 'true' : 'false' ,
              normalizedStylesOptimization.minify === true ? 'true' : 'false' ,
              ...routesShard,
            ])
              .on('message', data => {
                if (data.success === false) {
                  reject(new Error(`Unable to render ${data.outputIndexPath}.\nError: ${data.error}`));

                  return;
                }

                if (data.logLevel) {
                  spinner.stop();
                  context.logger.log(data.logLevel, data.message);
                  spinner.start();
                }
              })
              .on('exit', resolve)
              .on('error', reject);
          })
        );

      await Promise.all(childProcesses);
    } catch (error) {
      spinner.fail(`Prerendering routes to ${outputPath} failed.`);

      return { success: false, error: error.message };
    }

    spinner.succeed(`Prerendering routes to ${outputPath} complete.`);

    if (browserOptions.serviceWorker) {
      spinner.start('Generating service worker...');
      try {
        await augmentAppWithServiceWorker(
          host,
          root,
          projectRoot,
          normalize(outputPath),
          browserOptions.baseHref || '/',
          browserOptions.ngswConfigPath,
        );
      } catch (error) {
        spinner.fail('Service worker generation failed.');

        return { success: false, error: error.message };
      }

      spinner.succeed('Service worker generation complete.');
    }
  }

  return browserResult;
}

/**
 * Builds the browser and server, then renders each route in options.routes
 * and writes them to prerender/<route>/index.html for each output path in
 * the browser result.
 */
export async function execute(
  options: PrerenderBuilderOptions,
  context: BuilderContext
): Promise<PrerenderBuilderOutput> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const browserOptions =
    await context.getTargetOptions(browserTarget) as unknown as BrowserBuilderOptions;
  const tsConfigPath =
    typeof browserOptions.tsConfig === 'string' ? browserOptions.tsConfig : undefined;

  const routes = await getRoutes(options, tsConfigPath, context);
  if (!routes.length) {
    throw new Error(`Could not find any routes to prerender.`);
  }

  const result = await _scheduleBuilds(options, context);
  const { success, error, browserResult, serverResult } = result;
  if (!success || !browserResult || !serverResult) {
    return { success, error } as BuilderOutput;
  }

  return _renderUniversal(
    routes,
    context,
    browserResult,
    serverResult,
    browserOptions,
    options.numProcesses,
  );
}

export default createBuilder(execute);
