/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderOutput, createBuilder, BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { Buffer } from 'buffer';
import * as fs from 'fs';
import * as path from 'path';

import { Schema } from './schema';

export type PrerenderBuilderOptions = Schema & json.JsonObject;

export type PrerenderBuilderOutput = BuilderOutput & {
  baseOutputPath: string;
  outputPaths: string[];
  outputPath: string;
};

/**
 * Renders each route in options.routes and writes them to
 * <route>/index.html for each output path in the browser result.
 */
async function _renderUniversal(
  options: Schema,
  context: BuilderContext,
  browserResult: PrerenderBuilderOutput,
  serverResult: PrerenderBuilderOutput,
): Promise<PrerenderBuilderOutput> {
  // We need to render the routes for each locale from the browser output.
  for (const outputPath of browserResult.outputPaths) {
    const localeDirectory = path.relative(browserResult.baseOutputPath, outputPath);
    const browserIndexOutputPath = path.join(outputPath, 'index.html');
    const indexHtml = fs.readFileSync(browserIndexOutputPath, 'utf8');
    const { AppServerModuleDef, renderModuleFn } =
      await _getServerModuleBundle(serverResult, localeDirectory);

    context.logger.info(`\nPrerendering ${options.routes.length} route(s) to ${outputPath}`);

    // Render each route and write them to <route>/index.html.
    for (const route of options.routes) {
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

      // There will never conflicting output folders
      // because items in options.routes must be unique.
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
  serverResult: PrerenderBuilderOutput,
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
): Promise<PrerenderBuilderOutput | BuilderOutput> {
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
      browserTargetRun.result as unknown as PrerenderBuilderOutput,
      serverTargetRun.result as unknown as PrerenderBuilderOutput,
    ]);

    if (browserResult.success === false || browserResult.baseOutputPath === undefined) {
      return browserResult;
    }
    if (serverResult.success === false) {
      return serverResult;
    }

    return await _renderUniversal(options, context, browserResult, serverResult);
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    await Promise.all([browserTargetRun.stop(), serverTargetRun.stop()]);
  }
}

export default createBuilder(execute);
