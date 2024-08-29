/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord,
} from '../../tools/esbuild/bundler-context';
import { BuildOutputAsset } from '../../tools/esbuild/bundler-execution-result';
import { generateIndexHtml } from '../../tools/esbuild/index-html-generator';
import { createOutputFile } from '../../tools/esbuild/utils';
import { maxWorkers } from '../../utils/environment-options';
import {
  SERVER_APP_MANIFEST_FILENAME,
  generateAngularServerAppManifest,
} from '../../utils/server-rendering/manifest';
import { prerenderPages } from '../../utils/server-rendering/prerender';
import { augmentAppWithServiceWorkerEsbuild } from '../../utils/service-worker';
import { INDEX_HTML_SERVER, NormalizedApplicationBuildOptions } from './options';

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
    baseHref = '/',
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

  // Index HTML content without CSS inlining to be used for server rendering (AppShell, SSG and SSR).
  // NOTE: Critical CSS inlining is deliberately omitted here, as it will be handled during server rendering.
  // Additionally, when using prerendering or AppShell, the index HTML file may be regenerated.
  // To prevent generating duplicate files with the same filename, a `Map` is used to store and manage the files.
  const additionalHtmlOutputFiles = new Map<string, BuildOutputFile>();

  // Generate index HTML file
  // If localization is enabled, index generation is handled in the inlining process.
  if (indexHtmlOptions) {
    const { csrContent, ssrContent, errors, warnings } = await generateIndexHtml(
      initialFiles,
      outputFiles,
      options,
      locale,
    );

    allErrors.push(...errors);
    allWarnings.push(...warnings);

    additionalHtmlOutputFiles.set(
      indexHtmlOptions.output,
      createOutputFile(indexHtmlOptions.output, csrContent, BuildOutputFileType.Browser),
    );

    if (ssrContent) {
      additionalHtmlOutputFiles.set(
        INDEX_HTML_SERVER,
        createOutputFile(INDEX_HTML_SERVER, ssrContent, BuildOutputFileType.Server),
      );
    }
  }

  // Create server manifest
  if (prerenderOptions || appShellOptions || ssrOptions) {
    additionalOutputFiles.push(
      createOutputFile(
        SERVER_APP_MANIFEST_FILENAME,
        generateAngularServerAppManifest(
          additionalHtmlOutputFiles,
          outputFiles,
          optimizationOptions.styles.inlineCritical ?? false,
          undefined,
        ),
        BuildOutputFileType.Server,
      ),
    );
  }

  // Pre-render (SSG) and App-shell
  // If localization is enabled, prerendering is handled in the inlining process.
  if ((prerenderOptions || appShellOptions) && !allErrors.length) {
    assert(
      indexHtmlOptions,
      'The "index" option is required when using the "ssg" or "appShell" options.',
    );

    const {
      output,
      warnings,
      errors,
      prerenderedRoutes: generatedRoutes,
      serializableRouteTreeNode,
    } = await prerenderPages(
      workspaceRoot,
      baseHref,
      appShellOptions,
      prerenderOptions,
      [...outputFiles, ...additionalOutputFiles],
      assetFiles,
      sourcemapOptions.scripts,
      maxWorkers,
      verbose,
    );

    allErrors.push(...errors);
    allWarnings.push(...warnings);
    prerenderedRoutes.push(...Array.from(generatedRoutes));

    const indexHasBeenPrerendered = generatedRoutes.has(indexHtmlOptions.output);

    for (const [path, { content, appShellRoute }] of Object.entries(output)) {
      // Update the index contents with the app shell under these conditions:
      // - Replace 'index.html' with the app shell only if it hasn't been prerendered yet.
      // - Always replace 'index.csr.html' with the app shell.
      const filePath = appShellRoute && !indexHasBeenPrerendered ? indexHtmlOptions.output : path;
      additionalHtmlOutputFiles.set(
        filePath,
        createOutputFile(filePath, content, BuildOutputFileType.Browser),
      );
    }

    if (ssrOptions) {
      // Regenerate the manifest to append route tree. This is only needed if SSR is enabled.
      const manifest = additionalOutputFiles.find((f) => f.path === SERVER_APP_MANIFEST_FILENAME);
      assert(manifest, `${SERVER_APP_MANIFEST_FILENAME} was not found in output files.`);

      manifest.contents = new TextEncoder().encode(
        generateAngularServerAppManifest(
          additionalHtmlOutputFiles,
          outputFiles,
          optimizationOptions.styles.inlineCritical ?? false,
          serializableRouteTreeNode,
        ),
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
        baseHref,
        options.indexHtmlOptions?.output,
        // Ensure additional files recently added are used
        [...outputFiles, ...additionalOutputFiles],
        assetFiles,
      );

      additionalOutputFiles.push(
        createOutputFile('ngsw.json', serviceWorkerResult.manifest, BuildOutputFileType.Browser),
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
