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
import { BrowserBuilderOptions, BrowserBuilderOutput } from '@angular-devkit/build-angular';
import { normalizeOptimization } from '@angular-devkit/build-angular/src/utils/normalize-optimization';
import { augmentAppWithServiceWorker } from '@angular-devkit/build-angular/src/utils/service-worker';
import { normalize, resolve } from '@angular-devkit/core';
import express from 'express';
import * as http from 'http';
import ora from 'ora';
import { cpus } from 'os';
import * as path from 'path';
import Piscina from 'piscina';
import { promisify } from 'util';
import { getAvailablePort } from '../ssr-dev-server/utils';
import { Schema as PrerenderBuilderOptions } from './schema';
import { getRoutes } from './utils';
import { RenderOptions } from './worker';

/**
 * Builds the browser and server, then renders each route in options.routes
 * and writes them to prerender/<route>/index.html for each output path in
 * the browser result.
 */
export async function execute(
  options: PrerenderBuilderOptions,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const browserOptions = (await context.getTargetOptions(
    browserTarget,
  )) as unknown as BrowserBuilderOptions;
  const routes = await getRoutes(options, browserOptions.tsConfig, context);

  if (!routes.length) {
    throw new Error(`Could not find any routes to generate.`);
  }

  const { result } = await context.scheduleTarget(browserTarget, {
    watch: false,
    serviceWorker: false,
  });

  const { success, error, outputPaths } = (await result) as BrowserBuilderOutput;
  if (!success) {
    return { success, error } as BuilderOutput;
  }

  const { styles: normalizedStylesOptimization } = normalizeOptimization(
    browserOptions.optimization,
  );

  const worker = createWorker();
  try {
    for (const outputPath of outputPaths) {
      const spinner = ora(`Prerendering ${routes.length} route(s) to ${outputPath}...`).start();

      const staticServer = await createStaticServer(outputPath);
      try {
        await Promise.all(
          routes.map((route) => {
            const options: RenderOptions = {
              inlineCriticalCss: normalizedStylesOptimization.inlineCritical,
              outputPath,
              route,
              port: staticServer.port,
            };

            return worker.run(options, { name: 'render' });
          }),
        );

        spinner.succeed(`Prerendering routes to ${outputPath} complete.`);

        if (browserOptions.serviceWorker) {
          const swResult = await generateServiceWorker(context, outputPath, browserOptions);
          if (!swResult.success) {
            return swResult;
          }
        }
      } catch (error) {
        spinner.fail(`Prerendering routes to ${outputPath} failed.`);

        return { success: false, error: error.message };
      } finally {
        await staticServer.close();
      }
    }

    return { success: true };
  } finally {
    void worker.destroy();
  }
}

async function createStaticServer(browserOutputRoot: string): Promise<{
  close: () => Promise<void>;
  port: number;
}> {
  const app = express();
  app.use(express.static(browserOutputRoot));
  const port = await getAvailablePort();
  const server = new http.Server(app);
  await new Promise<void>((res) => server.listen(port, res));

  return {
    close: promisify(server.close.bind(server)),
    port,
  };
}

function createWorker(): Piscina {
  const maxThreads = Math.max(Math.min(cpus().length, 6) - 1, 1);

  const worker = new Piscina({
    filename: path.join(__dirname, 'worker.js'),
    name: 'render',
    maxThreads,
  });

  return worker;
}

async function generateServiceWorker(
  context: BuilderContext,
  outputPath: string,
  browserOptions: BrowserBuilderOptions,
): Promise<BuilderOutput> {
  const spinner = ora(`Generating service worker for ${outputPath}...`).start();

  try {
    const projectName = context.target?.project;
    if (!projectName) {
      throw new Error('The builder requires a target.');
    }

    const root = normalize(context.workspaceRoot);
    const projectMetadata = await context.getProjectMetadata(projectName);
    const projectRoot = resolve(root, normalize((projectMetadata.root as string) ?? ''));

    await augmentAppWithServiceWorker(
      root,
      projectRoot,
      normalize(outputPath),
      browserOptions.baseHref || '/',
      browserOptions.ngswConfigPath,
    );

    spinner.succeed(`Service worker generation for ${outputPath} complete.`);

    return { success: true };
  } catch (error) {
    spinner.fail(`Service worker generation for ${outputPath} failed.`);

    return { success: false, error: error.message };
  }
}

export default createBuilder(execute);
