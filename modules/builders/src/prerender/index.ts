/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, BuilderOutput, createBuilder, targetFromTargetString } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as path from 'path';

import { Schema } from './schema';
import { getRoutes } from './utils';

export type PrerenderBuilderOptions = Schema & json.JsonObject;

export type PrerenderBuilderOutput = BuilderOutput;

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
 * Renders each route in options.routes and writes them to
 * <route>/index.html for each output path in the browser result.
 */
async function _renderUniversal(
  routes: string[],
  context: BuilderContext,
  browserResult: BuildBuilderOutput,
  serverResult: BuildBuilderOutput,
): Promise<BuildBuilderOutput> {
  // We need to render the routes for each locale from the browser output.
  for (const outputPath of browserResult.outputPaths) {
    const localeDirectory = path.relative(browserResult.baseOutputPath, outputPath);
    const browserIndexOutputPath = path.join(outputPath, 'index.html');
    const indexHtml = fs.readFileSync(browserIndexOutputPath, 'utf8');
    const { AppServerModuleDef, renderModuleFn } =
      await _getServerModuleBundle(serverResult, localeDirectory);

    context.logger.info(`\nPrerendering ${routes.length} route(s) to ${outputPath}`);

    // Render each route and write them to <route>/index.html.
    for (const route of routes) {
      const renderOpts = {
        document: indexHtml + '<!-- This page was prerendered with Angular Universal -->',
        url: route,
      };
      const html = await renderModuleFn(AppServerModuleDef, renderOpts);

      const outputFolderPath = path.join(outputPath, route);
      const outputIndexPath = path.join(outputFolderPath, 'index.html');

      // This case happens when we are prerendering "/".
      if (browserIndexOutputPath === outputIndexPath) {
        const browserIndexOutputPathOriginal = path.join(outputPath, 'index.original.html');
        fs.writeFileSync(browserIndexOutputPathOriginal, indexHtml);
      }

      try {
        fs.mkdirSync(outputFolderPath, { recursive: true });
        fs.writeFileSync(outputIndexPath, html);
        const bytes = Buffer.byteLength(html).toFixed(0);
        context.logger.info(
          `CREATE ${outputIndexPath} (${bytes} bytes)`
        );
      } catch {
        context.logger.error(`Unable to render ${outputIndexPath}`);
      }
    }
  }

  return browserResult;
}

/**
 * If the app module bundle path is not specified in options.appModuleBundle,
 * this method searches for what is usually the app module bundle file and
 * returns its server module bundle.
 *
 * Throws if no app module bundle is found.
 */
async function _getServerModuleBundle(
  serverResult: BuildBuilderOutput,
  browserLocaleDirectory: string,
) {
  const { baseOutputPath = '' } = serverResult;
  const serverBundlePath = path.join(baseOutputPath, browserLocaleDirectory, 'main.js');

  if (!fs.existsSync(serverBundlePath)) {
    throw new Error(`Could not find the main bundle: ${serverBundlePath}`);
  }

  const {
    AppServerModule,
    AppServerModuleNgFactory,
    renderModule,
    renderModuleFactory,
  } = await import(serverBundlePath);

  if (renderModuleFactory && AppServerModuleNgFactory) {
    // Happens when in ViewEngine mode.
    return {
      renderModuleFn: renderModuleFactory,
      AppServerModuleDef: AppServerModuleNgFactory,
    };
  }

  if (renderModule && AppServerModule) {
    // Happens when in Ivy mode.
    return {
      renderModuleFn: renderModule,
      AppServerModuleDef: AppServerModule,
    };
  }
  throw new Error(`renderModule method and/or AppServerModule were not exported from: ${serverBundlePath}.`);
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
  const routes = getRoutes(context.workspaceRoot, options.routesFile, options.routes);
  if (!routes.length) {
    throw new Error('No routes found.');
  }
  const result = await _scheduleBuilds(options, context);
  const { success, error, browserResult, serverResult } = result;
  if (!success || !browserResult || !serverResult) {
    return { success, error } as BuilderOutput;
  }

  return _renderUniversal(routes, context, browserResult, serverResult);
}

export default createBuilder(execute);
