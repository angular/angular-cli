/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder, targetFromTargetString } from '@angular-devkit/architect';
import { BrowserBuilderOptions } from '@angular-devkit/build-angular';
import { fork } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { PrerenderBuilderOptions, PrerenderBuilderOutput } from './models';
import { getIndexOutputFile, getRoutes, shardArray } from './utils';

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

async function _parallelRenderRoutes(
  shardedRoutes: string[][],
  context: BuilderContext,
  indexHtml: string,
  outputPath: string,
  indexFile: string,
  serverBundlePath: string,
): Promise<void> {
  const workerFile = path.join(__dirname, 'render.js');
  const childProcesses = shardedRoutes.map(routes =>
    new Promise((resolve, reject) => {
      fork(workerFile, [
        indexHtml,
        indexFile,
        serverBundlePath,
        outputPath,
        ...routes,
      ])
        .on('message', data => {
          if (data.success) {
            context.logger.info(`CREATE ${data.outputIndexPath} (${data.bytes} bytes)`);
          } else {
            context.logger.error(`Error: ${data.error.message}`);
            context.logger.error(`Unable to render ${data.outputIndexPath}`);
          }
        })
        .on('exit', resolve)
        .on('error', reject);
    })
  );

  await Promise.all(childProcesses);
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
): Promise<BuildBuilderOutput> {
  // Users can specify a different base html file e.g. "src/home.html"
  const indexFile = getIndexOutputFile(browserOptions);
  // We need to render the routes for each locale from the browser output.
  for (const outputPath of browserResult.outputPaths) {
    const browserIndexInputPath = path.join(outputPath, indexFile);
    const indexHtml = fs.readFileSync(browserIndexInputPath, 'utf8');

    const { baseOutputPath = '' } = serverResult;
    const localeDirectory = path.relative(browserResult.baseOutputPath, outputPath);
    const serverBundlePath = path.join(baseOutputPath, localeDirectory, 'main.js');
    if (!fs.existsSync(serverBundlePath)) {
      throw new Error(`Could not find the main bundle: ${serverBundlePath}`);
    }

    const shardedRoutes = shardArray(routes, numProcesses);
    context.logger.info(`\nPrerendering ${routes.length} route(s) to ${outputPath}`);

    await _parallelRenderRoutes(
      shardedRoutes,
      context,
      indexHtml,
      outputPath,
      indexFile,
      serverBundlePath,
    );
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
