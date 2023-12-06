/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'node:assert';
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord,
} from '../../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import { generateIndexHtml } from '../../tools/esbuild/index-html-generator';
import { createOutputFileFromText } from '../../tools/esbuild/utils';
import { maxWorkers } from '../../utils/environment-options';
import { prerenderPages } from '../../utils/server-rendering/prerender';
import { augmentAppWithServiceWorkerEsbuild } from '../../utils/service-worker';
import { NormalizedApplicationBuildOptions } from './options';

/**
 * Run additional builds steps including SSG, AppShell, Index HTML file and Service worker generation.
 * @param options The normalized application builder options used to create the build.
 * @param outputFiles The output files of an executed build.
 * @param assetFiles The assets of an executed build.
 * @param initialFiles A map containing initial file information for the executed build.
 * @param locale A language locale to insert in the index.html.
 */
export async function executePostBundleSteps(
  options: NormalizedApplicationBuildOptions,
  outputFiles: BuildOutputFile[],
  assetFiles: BuildOutputAsset[],
  initialFiles: Map<string, InitialFileRecord>,
  locale: string | undefined,
): Promise<{
  errors: string[];
  warnings: string[];
  additionalOutputFiles: BuildOutputFile[];
  additionalAssets: BuildOutputAsset[];
  prerenderedRoutes: string[];
}> {
  const additionalAssets: BuildOutputAsset[] = [];
  const additionalOutputFiles: BuildOutputFile[] = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const prerenderedRoutes: string[] = [];

  const {
    serviceWorker,
    indexHtmlOptions,
    optimizationOptions,
    sourcemapOptions,
    ssrOptions,
    prerenderOptions,
    appShellOptions,
    workspaceRoot,
    verbose,
  } = options;

  /**
   * Index HTML content without CSS inlining to be used for server rendering (AppShell, SSG and SSR).
   *
   * NOTE: we don't perform critical CSS inlining as this will be done during server rendering.
   */
  let indexContentOutputNoCssInlining: string | undefined;

  // When using prerender/app-shell the index HTML file can be regenerated.
  // Thus, we use a Map so that we do not generate 2 files with the same filename.
  const additionalHtmlOutputFiles = new Map<string, BuildOutputFile>();

  // Generate index HTML file
  // If localization is enabled, index generation is handled in the inlining process.
  if (indexHtmlOptions) {
    const { content, contentWithoutCriticalCssInlined, errors, warnings } = await generateIndexHtml(
      initialFiles,
      outputFiles,
      {
        ...options,
        optimizationOptions,
      },
      locale,
    );

    indexContentOutputNoCssInlining = contentWithoutCriticalCssInlined;
    allErrors.push(...errors);
    allWarnings.push(...warnings);

    additionalHtmlOutputFiles.set(
      indexHtmlOptions.output,
      createOutputFileFromText(indexHtmlOptions.output, content, BuildOutputFileType.Browser),
    );

    if (ssrOptions) {
      const serverIndexHtmlFilename = 'index.server.html';
      additionalHtmlOutputFiles.set(
        serverIndexHtmlFilename,
        createOutputFileFromText(
          serverIndexHtmlFilename,
          contentWithoutCriticalCssInlined,
          BuildOutputFileType.Server,
        ),
      );
    }
  }

  // Pre-render (SSG) and App-shell
  // If localization is enabled, prerendering is handled in the inlining process.
  if (prerenderOptions || appShellOptions) {
    assert(
      indexContentOutputNoCssInlining,
      'The "index" option is required when using the "ssg" or "appShell" options.',
    );

    const {
      output,
      warnings,
      errors,
      prerenderedRoutes: generatedRoutes,
    } = await prerenderPages(
      workspaceRoot,
      appShellOptions,
      prerenderOptions,
      outputFiles,
      assetFiles,
      indexContentOutputNoCssInlining,
      sourcemapOptions.scripts,
      optimizationOptions.styles.inlineCritical,
      maxWorkers,
      verbose,
    );

    allErrors.push(...errors);
    allWarnings.push(...warnings);
    prerenderedRoutes.push(...Array.from(generatedRoutes));

    for (const [path, content] of Object.entries(output)) {
      additionalHtmlOutputFiles.set(
        path,
        createOutputFileFromText(path, content, BuildOutputFileType.Browser),
      );
    }
  }

  additionalOutputFiles.push(...additionalHtmlOutputFiles.values());

  // Augment the application with service worker support
  // If localization is enabled, service worker is handled in the inlining process.
  if (serviceWorker) {
    try {
      const serviceWorkerResult = await augmentAppWithServiceWorkerEsbuild(
        workspaceRoot,
        serviceWorker,
        options.baseHref || '/',
        // Ensure additional files recently added are used
        [...outputFiles, ...additionalOutputFiles],
        assetFiles,
      );
      additionalOutputFiles.push(
        createOutputFileFromText(
          'ngsw.json',
          serviceWorkerResult.manifest,
          BuildOutputFileType.Browser,
        ),
      );
      additionalAssets.push(...serviceWorkerResult.assetFiles);
    } catch (error) {
      allErrors.push(error instanceof Error ? error.message : `${error}`);
    }
  }

  return {
    errors: allErrors,
    warnings: allWarnings,
    additionalAssets,
    prerenderedRoutes,
    additionalOutputFiles,
  };
}
