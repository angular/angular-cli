/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { augmentAppWithServiceWorker } from '@angular/build/private';
import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { JsonObject } from '@angular-devkit/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Piscina from 'piscina';
import { normalizeOptimization } from '../../utils';
import { assertIsError } from '../../utils/error';
import { Spinner } from '../../utils/spinner';
import { BrowserBuilderOutput } from '../browser';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import { ServerBuilderOutput } from '../server';
import { Schema as BuildWebpackAppShellSchema } from './schema';

async function _renderUniversal(
  options: BuildWebpackAppShellSchema,
  context: BuilderContext,
  browserResult: BrowserBuilderOutput,
  serverResult: ServerBuilderOutput,
  spinner: Spinner,
): Promise<BrowserBuilderOutput> {
  // Get browser target options.
  const browserTarget = targetFromTargetString(options.browserTarget);
  const rawBrowserOptions = await context.getTargetOptions(browserTarget);
  const browserBuilderName = await context.getBuilderNameForTarget(browserTarget);
  const browserOptions = await context.validateOptions<JsonObject & BrowserBuilderSchema>(
    rawBrowserOptions,
    browserBuilderName,
  );

  // Locate zone.js to load in the render worker
  const root = context.workspaceRoot;
  const zonePackage = require.resolve('zone.js', { paths: [root] });

  const projectName = context.target && context.target.project;
  if (!projectName) {
    throw new Error('The builder requires a target.');
  }

  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = path.join(root, (projectMetadata.root as string | undefined) ?? '');

  const { styles } = normalizeOptimization(browserOptions.optimization);
  let inlineCriticalCssProcessor;
  if (styles.inlineCritical) {
    const { InlineCriticalCssProcessor } = await import('@angular/build/private');
    inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      minify: styles.minify,
      deployUrl: browserOptions.deployUrl,
    });
  }

  const renderWorker = new Piscina({
    filename: require.resolve('./render-worker'),
    maxThreads: 1,
    workerData: { zonePackage },
    recordTiming: false,
  });

  try {
    for (const { path: outputPath, baseHref } of browserResult.outputs) {
      const localeDirectory = path.relative(browserResult.baseOutputPath, outputPath);
      const browserIndexOutputPath = path.join(outputPath, 'index.html');
      const indexHtml = await fs.promises.readFile(browserIndexOutputPath, 'utf8');
      const serverBundlePath = await _getServerModuleBundlePath(
        options,
        context,
        serverResult,
        localeDirectory,
      );

      let html: string = await renderWorker.run({
        serverBundlePath,
        document: indexHtml,
        url: options.route,
      });

      // Overwrite the client index file.
      const outputIndexPath = options.outputIndexPath
        ? path.join(root, options.outputIndexPath)
        : browserIndexOutputPath;

      if (inlineCriticalCssProcessor) {
        const { content, warnings, errors } = await inlineCriticalCssProcessor.process(html, {
          outputPath,
        });
        html = content;

        if (warnings.length || errors.length) {
          spinner.stop();
          warnings.forEach((m) => context.logger.warn(m));
          errors.forEach((m) => context.logger.error(m));
          spinner.start();
        }
      }

      await fs.promises.writeFile(outputIndexPath, html);

      if (browserOptions.serviceWorker) {
        await augmentAppWithServiceWorker(
          projectRoot,
          root,
          outputPath,
          baseHref ?? '/',
          browserOptions.ngswConfigPath,
        );
      }
    }
  } finally {
    await renderWorker.destroy();
  }

  return browserResult;
}

async function _getServerModuleBundlePath(
  options: BuildWebpackAppShellSchema,
  context: BuilderContext,
  serverResult: ServerBuilderOutput,
  browserLocaleDirectory: string,
) {
  if (options.appModuleBundle) {
    return path.join(context.workspaceRoot, options.appModuleBundle);
  }

  const { baseOutputPath = '' } = serverResult;
  const outputPath = path.join(baseOutputPath, browserLocaleDirectory);

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Could not find server output directory: ${outputPath}.`);
  }

  const re = /^main\.(?:[a-zA-Z0-9]{16}\.)?js$/;
  const maybeMain = fs.readdirSync(outputPath).find((x) => re.test(x));

  if (!maybeMain) {
    throw new Error('Could not find the main bundle.');
  }

  return path.join(outputPath, maybeMain);
}

async function _appShellBuilder(
  options: BuildWebpackAppShellSchema,
  context: BuilderContext,
): Promise<BuilderOutput> {
  const browserTarget = targetFromTargetString(options.browserTarget);
  const serverTarget = targetFromTargetString(options.serverTarget);

  // Never run the browser target in watch mode.
  // If service worker is needed, it will be added in _renderUniversal();
  const browserOptions = (await context.getTargetOptions(browserTarget)) as JsonObject &
    BrowserBuilderSchema;

  const optimization = normalizeOptimization(browserOptions.optimization);
  optimization.styles.inlineCritical = false;

  const browserTargetRun = await context.scheduleTarget(browserTarget, {
    watch: false,
    serviceWorker: false,
    optimization: optimization as unknown as JsonObject,
  });

  if (browserTargetRun.info.builderName === '@angular-devkit/build-angular:application') {
    return {
      success: false,
      error:
        '"@angular-devkit/build-angular:application" has built-in app-shell generation capabilities. ' +
        'The "appShell" option should be used instead.',
    };
  }

  const serverTargetRun = await context.scheduleTarget(serverTarget, {
    watch: false,
  });

  let spinner: Spinner | undefined;

  try {
    const [browserResult, serverResult] = await Promise.all([
      browserTargetRun.result as Promise<BrowserBuilderOutput>,
      serverTargetRun.result as Promise<ServerBuilderOutput>,
    ]);

    if (browserResult.success === false || browserResult.baseOutputPath === undefined) {
      return browserResult;
    } else if (serverResult.success === false) {
      return serverResult;
    }

    spinner = new Spinner();
    spinner.start('Generating application shell...');
    const result = await _renderUniversal(options, context, browserResult, serverResult, spinner);
    spinner.succeed('Application shell generation complete.');

    return result;
  } catch (err) {
    spinner?.fail('Application shell generation failed.');
    assertIsError(err);

    return { success: false, error: err.message };
  } finally {
    await Promise.all([browserTargetRun.stop(), serverTargetRun.stop()]);
  }
}

export default createBuilder(_appShellBuilder);
