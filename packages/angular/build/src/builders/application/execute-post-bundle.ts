/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile } from 'esbuild';
import assert from 'node:assert';
import {
  BuildOutputFile,
  BuildOutputFileType,
  InitialFileRecord,
} from '../../tools/esbuild/bundler-context';
import {
  BuildOutputAsset,
  PrerenderedRoutesRecord,
} from '../../tools/esbuild/bundler-execution-result';
import { generateIndexHtml } from '../../tools/esbuild/index-html-generator';
import { createOutputFile } from '../../tools/esbuild/utils';
import { maxWorkers } from '../../utils/environment-options';
import {
  SERVER_APP_MANIFEST_FILENAME,
  generateAngularServerAppManifest,
} from '../../utils/server-rendering/manifest';
import {
  RouteRenderMode,
  WritableSerializableRouteTreeNode,
} from '../../utils/server-rendering/models';
import { prerenderPages } from '../../utils/server-rendering/prerender';
import { augmentAppWithServiceWorkerEsbuild } from '../../utils/service-worker';
import { INDEX_HTML_CSR, INDEX_HTML_SERVER, NormalizedApplicationBuildOptions } from './options';
import { OutputMode } from './schema';

/**
 * Run additional builds steps including SSG, AppShell, Index HTML file and Service worker generation.
 * @param metafile An esbuild metafile object.
 * @param options The normalized application builder options used to create the build.
 * @param outputFiles The output files of an executed build.
 * @param assetFiles The assets of an executed build.
 * @param initialFiles A map containing initial file information for the executed build.
 * @param locale A language locale to insert in the index.html.
 */
// eslint-disable-next-line max-lines-per-function
export async function executePostBundleSteps(
  metafile: Metafile,
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
  prerenderedRoutes: PrerenderedRoutesRecord;
}> {
  const additionalAssets: BuildOutputAsset[] = [];
  const additionalOutputFiles: BuildOutputFile[] = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const prerenderedRoutes: PrerenderedRoutesRecord = {};

  const {
    baseHref = '/',
    serviceWorker,
    ssrOptions,
    indexHtmlOptions,
    optimizationOptions,
    sourcemapOptions,
    outputMode,
    serverEntryPoint,
    prerenderOptions,
    appShellOptions,
    publicPath,
    workspaceRoot,
    partialSSRBuild,
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
        createOutputFile(INDEX_HTML_SERVER, ssrContent, BuildOutputFileType.ServerApplication),
      );
    }
  }

  // Create server manifest
  const initialFilesPaths = new Set(initialFiles.keys());
  if (serverEntryPoint && (outputMode || prerenderOptions || appShellOptions || ssrOptions)) {
    const { manifestContent, serverAssetsChunks } = generateAngularServerAppManifest(
      additionalHtmlOutputFiles,
      outputFiles,
      optimizationOptions.styles.inlineCritical ?? false,
      undefined,
      locale,
      baseHref,
      initialFilesPaths,
      metafile,
      publicPath,
    );

    additionalOutputFiles.push(
      ...serverAssetsChunks,
      createOutputFile(
        SERVER_APP_MANIFEST_FILENAME,
        manifestContent,
        BuildOutputFileType.ServerApplication,
      ),
    );
  }

  // Pre-render (SSG) and App-shell
  // If localization is enabled, prerendering is handled in the inlining process.
  if (
    !partialSSRBuild &&
    (prerenderOptions || appShellOptions || (outputMode && serverEntryPoint)) &&
    !allErrors.length
  ) {
    assert(
      indexHtmlOptions,
      'The "index" option is required when using the "ssg" or "appShell" options.',
    );

    const { output, warnings, errors, serializableRouteTreeNode } = await prerenderPages(
      workspaceRoot,
      baseHref,
      appShellOptions,
      prerenderOptions,
      [...outputFiles, ...additionalOutputFiles],
      assetFiles,
      outputMode,
      sourcemapOptions.scripts,
      maxWorkers,
    );

    allErrors.push(...errors);
    allWarnings.push(...warnings);

    const indexHasBeenPrerendered = output[indexHtmlOptions.output];
    for (const [path, { content, appShellRoute }] of Object.entries(output)) {
      // Update the index contents with the app shell under these conditions:
      // - Replace 'index.html' with the app shell only if it hasn't been prerendered yet.
      // - Always replace 'index.csr.html' with the app shell.
      let filePath = path;
      if (appShellRoute && !indexHasBeenPrerendered) {
        if (outputMode !== OutputMode.Server && indexHtmlOptions.output === INDEX_HTML_CSR) {
          filePath = 'index.html';
        } else {
          filePath = indexHtmlOptions.output;
        }
      }

      additionalHtmlOutputFiles.set(
        filePath,
        createOutputFile(filePath, content, BuildOutputFileType.Browser),
      );
    }

    const serializableRouteTreeNodeForManifest: WritableSerializableRouteTreeNode = [];
    for (const metadata of serializableRouteTreeNode) {
      serializableRouteTreeNodeForManifest.push(metadata);

      if (metadata.renderMode === RouteRenderMode.Prerender && !metadata.route.includes('*')) {
        prerenderedRoutes[metadata.route] = { headers: metadata.headers };
      }
    }

    if (outputMode === OutputMode.Server) {
      // Regenerate the manifest to append route tree. This is only needed if SSR is enabled.
      const manifest = additionalOutputFiles.find((f) => f.path === SERVER_APP_MANIFEST_FILENAME);
      assert(manifest, `${SERVER_APP_MANIFEST_FILENAME} was not found in output files.`);

      const { manifestContent, serverAssetsChunks } = generateAngularServerAppManifest(
        additionalHtmlOutputFiles,
        outputFiles,
        optimizationOptions.styles.inlineCritical ?? false,
        serializableRouteTreeNodeForManifest,
        locale,
        baseHref,
        initialFilesPaths,
        metafile,
        publicPath,
      );

      for (const chunk of serverAssetsChunks) {
        const idx = additionalOutputFiles.findIndex(({ path }) => path === chunk.path);
        if (idx === -1) {
          additionalOutputFiles.push(chunk);
        } else {
          additionalOutputFiles[idx] = chunk;
        }
      }

      manifest.contents = new TextEncoder().encode(manifestContent);
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
