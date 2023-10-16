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
}> {
  const additionalAssets: BuildOutputAsset[] = [];
  const additionalOutputFiles: BuildOutputFile[] = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

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

  // Generate index HTML file
  // If localization is enabled, index generation is handled in the inlining process.
  // NOTE: Localization with SSR is not currently supported.
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

    additionalOutputFiles.push(
      createOutputFileFromText(indexHtmlOptions.output, content, BuildOutputFileType.Browser),
    );

    if (ssrOptions) {
      additionalOutputFiles.push(
        createOutputFileFromText(
          'index.server.html',
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

    const { output, warnings, errors } = await prerenderPages(
      workspaceRoot,
      appShellOptions,
      prerenderOptions,
      outputFiles,
      indexContentOutputNoCssInlining,
      sourcemapOptions.scripts,
      optimizationOptions.styles.inlineCritical,
      maxWorkers,
      verbose,
    );

    allErrors.push(...errors);
    allWarnings.push(...warnings);

    for (const [path, content] of Object.entries(output)) {
      additionalOutputFiles.push(
        createOutputFileFromText(path, content, BuildOutputFileType.Browser),
      );
    }
  }

  // Augment the application with service worker support
  // If localization is enabled, service worker is handled in the inlining process.
  if (serviceWorker) {
    try {
      const serviceWorkerResult = await augmentAppWithServiceWorkerEsbuild(
        workspaceRoot,
        serviceWorker,
        options.baseHref || '/',
        outputFiles,
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
    additionalOutputFiles,
  };
}
