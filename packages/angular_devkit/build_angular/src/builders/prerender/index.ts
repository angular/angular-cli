/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import * as fs from 'fs';
import { readFile } from 'node:fs/promises';
import ora from 'ora';
import * as path from 'path';
import Piscina from 'piscina';
import { normalizeOptimization } from '../../utils';
import { maxWorkers } from '../../utils/environment-options';
import { assertIsError } from '../../utils/error';
import { augmentAppWithServiceWorker } from '../../utils/service-worker';
import { getIndexOutputFile } from '../../utils/webpack-browser-config';
import { BrowserBuilderOutput } from '../browser';
import { Schema as BrowserBuilderOptions } from '../browser/schema';
import { ServerBuilderOutput } from '../server';
import type { RenderOptions, RenderResult } from './render-worker';
import { RoutesExtractorWorkerData } from './routes-extractor-worker';
import { Schema } from './schema';

type PrerenderBuilderOptions = Schema & json.JsonObject;
type PrerenderBuilderOutput = BuilderOutput;

class RoutesSet extends Set<string> {
  override add(value: string): this {
    return super.add(value.charAt(0) === '/' ? value.slice(1) : value);
  }
}

async function getRoutes(
  indexFile: string,
  outputPath: string,
  serverBundlePath: string,
  options: PrerenderBuilderOptions,
  workspaceRoot: string,
): Promise<string[]> {
  const { routes: extraRoutes = [], routesFile, discoverRoutes } = options;
  const routes = new RoutesSet(extraRoutes);

  if (routesFile) {
    const routesFromFile = (await readFile(path.join(workspaceRoot, routesFile), 'utf8')).split(
      /\r?\n/,
    );
    for (const route of routesFromFile) {
      routes.add(route);
    }
  }

  if (discoverRoutes) {
    const renderWorker = new Piscina({
      filename: require.resolve('./routes-extractor-worker'),
      maxThreads: 1,
      workerData: {
        indexFile,
        outputPath,
        serverBundlePath,
        zonePackage: require.resolve('zone.js', { paths: [workspaceRoot] }),
      } as RoutesExtractorWorkerData,
    });

    const extractedRoutes: string[] = await renderWorker
      .run({})
      .finally(() => void renderWorker.destroy());

    for (const route of extractedRoutes) {
      routes.add(route);
    }
  }

  if (routes.size === 0) {
    throw new Error('Could not find any routes to prerender.');
  }

  return [...routes];
}

/**
 * Schedules the server and browser builds and returns their results if both builds are successful.
 */
async function _scheduleBuilds(
  options: PrerenderBuilderOptions,
  context: BuilderContext,
): Promise<
  BuilderOutput & {
    serverResult?: ServerBuilderOutput;
    browserResult?: BrowserBuilderOutput;
  }
> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const serverTarget = targetFromTargetString(options.serverTarget);

  const browserTargetRun = await context.scheduleTarget(browserTarget, {
    watch: false,
    serviceWorker: false,
    // todo: handle service worker augmentation
  });

  if (browserTargetRun.info.builderName === '@angular-devkit/build-angular:application') {
    return {
      success: false,
      error:
        '"@angular-devkit/build-angular:application" has built-in prerendering capabilities. ' +
        'The "prerender" option should be used instead.',
    };
  }

  const serverTargetRun = await context.scheduleTarget(serverTarget, {
    watch: false,
  });

  try {
    const [browserResult, serverResult] = await Promise.all([
      browserTargetRun.result as unknown as BrowserBuilderOutput,
      serverTargetRun.result as unknown as ServerBuilderOutput,
    ]);

    const success =
      browserResult.success && serverResult.success && browserResult.baseOutputPath !== undefined;
    const error = browserResult.error || (serverResult.error as string);

    return { success, error, browserResult, serverResult };
  } catch (e) {
    assertIsError(e);

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
  options: PrerenderBuilderOptions,
  context: BuilderContext,
  browserResult: BrowserBuilderOutput,
  serverResult: ServerBuilderOutput,
  browserOptions: BrowserBuilderOptions,
): Promise<PrerenderBuilderOutput> {
  const projectName = context.target && context.target.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = path.join(
    context.workspaceRoot,
    (projectMetadata.root as string | undefined) ?? '',
  );

  // Users can specify a different base html file e.g. "src/home.html"
  const indexFile = getIndexOutputFile(browserOptions.index);
  const { styles: normalizedStylesOptimization } = normalizeOptimization(
    browserOptions.optimization,
  );

  const zonePackage = require.resolve('zone.js', { paths: [context.workspaceRoot] });

  const { baseOutputPath = '' } = serverResult;
  const worker = new Piscina({
    filename: path.join(__dirname, 'render-worker.js'),
    maxThreads: maxWorkers,
    workerData: { zonePackage },
  });

  let routes: string[] | undefined;

  try {
    // We need to render the routes for each locale from the browser output.
    for (const { path: outputPath } of browserResult.outputs) {
      const localeDirectory = path.relative(browserResult.baseOutputPath, outputPath);
      const serverBundlePath = path.join(baseOutputPath, localeDirectory, 'main.js');

      if (!fs.existsSync(serverBundlePath)) {
        throw new Error(`Could not find the main bundle: ${serverBundlePath}`);
      }

      routes ??= await getRoutes(
        indexFile,
        outputPath,
        serverBundlePath,
        options,
        context.workspaceRoot,
      );

      const spinner = ora(`Prerendering ${routes.length} route(s) to ${outputPath}...`).start();

      try {
        const results = (await Promise.all(
          routes.map((route) => {
            const options: RenderOptions = {
              indexFile,
              deployUrl: browserOptions.deployUrl || '',
              inlineCriticalCss: !!normalizedStylesOptimization.inlineCritical,
              minifyCss: !!normalizedStylesOptimization.minify,
              outputPath,
              route,
              serverBundlePath,
            };

            return worker.run(options);
          }),
        )) as RenderResult[];
        let numErrors = 0;
        for (const { errors, warnings } of results) {
          spinner.stop();
          errors?.forEach((e) => context.logger.error(e));
          warnings?.forEach((e) => context.logger.warn(e));
          spinner.start();
          numErrors += errors?.length ?? 0;
        }
        if (numErrors > 0) {
          throw Error(`Rendering failed with ${numErrors} worker errors.`);
        }
      } catch (error) {
        spinner.fail(`Prerendering routes to ${outputPath} failed.`);
        assertIsError(error);

        return { success: false, error: error.message };
      }
      spinner.succeed(`Prerendering routes to ${outputPath} complete.`);

      if (browserOptions.serviceWorker) {
        spinner.start('Generating service worker...');
        try {
          await augmentAppWithServiceWorker(
            projectRoot,
            context.workspaceRoot,
            outputPath,
            browserOptions.baseHref || '/',
            browserOptions.ngswConfigPath,
          );
        } catch (error) {
          spinner.fail('Service worker generation failed.');
          assertIsError(error);

          return { success: false, error: error.message };
        }
        spinner.succeed('Service worker generation complete.');
      }
    }
  } finally {
    void worker.destroy();
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
  context: BuilderContext,
): Promise<PrerenderBuilderOutput> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const browserOptions = (await context.getTargetOptions(
    browserTarget,
  )) as unknown as BrowserBuilderOptions;
  const result = await _scheduleBuilds(options, context);
  const { success, error, browserResult, serverResult } = result;

  if (!success || !browserResult || !serverResult) {
    return { success, error } as BuilderOutput;
  }

  return _renderUniversal(options, context, browserResult, serverResult, browserOptions);
}

export default createBuilder(execute);
