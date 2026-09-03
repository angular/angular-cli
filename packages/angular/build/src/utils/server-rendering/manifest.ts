/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Metafile } from 'esbuild';
import { Buffer } from 'node:buffer';
import { extname } from 'node:path';
import {
  INDEX_HTML_SERVER,
  NormalizedApplicationBuildOptions,
} from '../../builders/application/options';
import {
  type BuildOutputFile,
  BuildOutputFileType,
  createOutputFile,
} from '../../tools/esbuild/bundler-files';
import { findNonce } from '../index-file/nonce';
import { joinUrlParts } from '../url';

export const SERVER_APP_MANIFEST_FILENAME = 'angular-app-manifest.mjs';
export const SERVER_APP_ENGINE_MANIFEST_FILENAME = 'angular-app-engine-manifest.mjs';

/**
 * A set of server-generated dependencies that are treated as external.
 *
 * These dependencies are marked as external because they are produced by a
 * separate bundling process and are not included in the primary bundle. This
 * ensures that these generated files are resolved from an external source rather
 * than being part of the main bundle.
 */
export const SERVER_GENERATED_EXTERNALS = new Set([
  './polyfills.server.mjs',
  './' + SERVER_APP_MANIFEST_FILENAME,
  './' + SERVER_APP_ENGINE_MANIFEST_FILENAME,
]);

const MAIN_SERVER_OUTPUT_FILENAME = 'main.server.mjs';

/**
 * A mapping of unsafe characters to their escaped Unicode equivalents.
 */
const UNSAFE_CHAR_MAP: Record<string, string> = {
  '`': '\\`',
  '$': '\\$',
  '\\': '\\\\',
};

/**
 * Escapes unsafe characters in a given string by replacing them with
 * their Unicode escape sequences.
 *
 * @param str - The string to be escaped.
 * @returns The escaped string where unsafe characters are replaced.
 */
function escapeUnsafeChars(str: string): string {
  return str.replace(/[$`\\]/g, (c) => UNSAFE_CHAR_MAP[c]);
}

/**
 * Generates the server manifest for the App Engine environment.
 *
 * This manifest is used to configure the server-side rendering (SSR) setup for the
 * Angular application when deployed to Google App Engine. It includes the entry points
 * for different locales and the base HREF for the application.
 *
 * @param i18nOptions - The internationalization options for the application build. This
 * includes settings for inlining locales and determining the output structure.
 * @param allowedHosts - A list of hosts that are allowed to access the server-side application.
 * @param baseHref - The base HREF for the application. This is used to set the base URL
 * for all relative URLs in the application.
 */
export function generateAngularServerAppEngineManifest(
  i18nOptions: NormalizedApplicationBuildOptions['i18nOptions'],
  allowedHosts: string[],
  baseHref: string | undefined,
): string {
  const entryPoints: Record<string, string> = {};
  const supportedLocales: Record<string, string> = {};

  if (i18nOptions.shouldInline && !i18nOptions.flatOutput) {
    for (const locale of i18nOptions.inlineLocales) {
      const { subPath } = i18nOptions.locales[locale];
      const importPath = `${subPath ? `${subPath}/` : ''}${MAIN_SERVER_OUTPUT_FILENAME}`;
      entryPoints[subPath] = `() => import('./${importPath}')`;
      supportedLocales[locale] = subPath;
    }
  } else {
    entryPoints[''] = `() => import('./${MAIN_SERVER_OUTPUT_FILENAME}')`;
    supportedLocales[i18nOptions.sourceLocale] = '';
  }

  // Remove trailing slash but retain leading slash.
  let basePath = baseHref || '/';
  if (basePath.length > 1 && basePath.at(-1) === '/') {
    basePath = basePath.slice(0, -1);
  }

  const manifestContent = `
export default {
  basePath: '${basePath}',
  allowedHosts: ${JSON.stringify(allowedHosts, undefined, 2)},
  supportedLocales: ${JSON.stringify(supportedLocales, undefined, 2)},
  entryPoints: {
    ${Object.entries(entryPoints)
      .map(([key, value]) => `'${key}': ${value}`)
      .join(',\n    ')}
  },
};
`;

  return manifestContent;
}

/**
 * Generates the server manifest for the standard Node.js environment.
 *
 * This manifest is used to configure the server-side rendering (SSR) setup for the
 * Angular application when running in a standard Node.js environment. It includes
 * information about the bootstrap module, whether to inline critical CSS, and any
 * additional HTML and CSS output files.
 *
 * @param additionalHtmlOutputFiles - A map of additional HTML output files generated
 * during the build process, keyed by their file paths.
 * @param outputFiles - An array of all output files from the build process, including
 * JavaScript and CSS files.
 * @param inlineCriticalCss - A boolean indicating whether critical CSS should be inlined
 * in the server-side rendered pages.
 * @param routes - An optional array of route definitions for the application, used for
 * server-side rendering and routing.
 * @param locale - An optional string representing the locale or language code to be used for
 * the application, helping with localization and rendering content specific to the locale.
 * @param baseHref - The base HREF for the application. This is used to set the base URL
 * for all relative URLs in the application.
 * @param initialFiles - A list of initial files that preload tags have already been added for.
 * @param metafile - An esbuild metafile object.
 * @param publicPath - The configured public path.
 *
 * @returns An object containing:
 * - `manifestContent`: A string of the SSR manifest content.
 * - `serverAssetsChunks`: An array of build output files containing the generated assets for the server.
 */
export async function generateAngularServerAppManifest(
  additionalHtmlOutputFiles: Map<string, BuildOutputFile>,
  outputFiles: BuildOutputFile[],
  inlineCriticalCss: boolean,
  routes: readonly unknown[] | undefined,
  locale: string | undefined,
  baseHref: string,
  initialFiles: Set<string>,
  metafile: Metafile,
  publicPath: string | undefined,
): Promise<{
  manifestContent: string;
  serverAssetsChunks: BuildOutputFile[];
}> {
  const serverAssetsChunks: BuildOutputFile[] = [];
  const serverAssets: Record<string, string> = {};
  const criticalCssPlans: unknown[] = [];
  let nonce: string | undefined;

  // TODO(alanagius): This is done here as we do not use module resolution bundler/node16
  const { compileSheet, encodePlan } = (await import(
    'beasties/compiler' as string
  )) as typeof import('beasties/compiler', { with: { 'resolution-mode': 'import' } });

  for (const file of [...additionalHtmlOutputFiles.values(), ...outputFiles]) {
    const extension = extname(file.path);
    if (extension === '.html') {
      const jsChunkFilePath = `assets-chunks/${file.path.replace(/[./]/g, '_')}.mjs`;
      const escapedContent = escapeUnsafeChars(file.text);

      serverAssetsChunks.push(
        createOutputFile(
          jsChunkFilePath,
          `export default \`${escapedContent}\`;`,
          BuildOutputFileType.ServerApplication,
        ),
      );

      // JavaScript engine script parsers normalize `\r\n` (2 bytes in UTF-8) to `\n` (1 byte in UTF-8) in template literals.
      // Subtracting the count of `\r\n` occurrences avoids allocating any temporary strings or match arrays for large assets.
      let size = Buffer.byteLength(file.text);
      let pos = file.text.indexOf('\r\n');
      while (pos !== -1) {
        size--;
        pos = file.text.indexOf('\r\n', pos + 2);
      }

      serverAssets[file.path] =
        `{size: ${size}, hash: '${file.hash}', text: () => import('./${jsChunkFilePath}').then(m => m.default)}`;
    } else if (inlineCriticalCss && extension === '.css') {
      const sheet = compileSheet(file.text, {
        href: joinUrlParts(publicPath ?? '', file.path),
      });
      criticalCssPlans.push(encodePlan(sheet));
    }
  }

  const indexHtml = additionalHtmlOutputFiles.get(INDEX_HTML_SERVER)?.text;
  if (indexHtml) {
    nonce = (await findNonce(indexHtml)) ?? undefined;
  }

  // When routes have been extracted, mappings are no longer needed, as preloads will be included in the metadata.
  const entryPointToBrowserMapping = routes?.length
    ? undefined
    : generateLazyLoadedFilesMappings(metafile, initialFiles, publicPath);

  const manifestContent = `
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  baseHref: '${baseHref}',
${criticalCssPlans.length ? `  criticalCssPlans: ${JSON.stringify(criticalCssPlans)},\n` : ''}${
    nonce ? `  nonce: ${JSON.stringify(nonce)},\n` : ''
  }  locale: ${JSON.stringify(locale)},
  routes: ${JSON.stringify(routes, undefined, 2)},
  entryPointToBrowserMapping: ${JSON.stringify(entryPointToBrowserMapping, undefined, 2)},
  assets: {
    ${Object.entries(serverAssets)
      .map(([key, value]) => `'${key}': ${value}`)
      .join(',\n    ')}
  },
};
`;

  return { manifestContent, serverAssetsChunks };
}

/**
 * Maps entry points to their corresponding browser bundles for lazy loading.
 *
 * This function processes a metafile's outputs to generate a mapping between browser-side entry points
 * and the associated JavaScript files that should be loaded in the browser. It includes the entry-point's
 * own path and any valid imports while excluding initial files or external resources.
 */
function generateLazyLoadedFilesMappings(
  metafile: Metafile,
  initialFiles: Set<string>,
  publicPath = '',
): Record<string, string[]> {
  const entryPointToBundles: Record<string, string[]> = {};
  for (const [fileName, { entryPoint, exports, imports }] of Object.entries(metafile.outputs)) {
    // Skip files that don't have an entryPoint, no exports, or are not .js
    if (!entryPoint || exports?.length < 1 || !fileName.endsWith('.js')) {
      continue;
    }

    const importedPaths: string[] = [`${publicPath}${fileName}`];

    for (const { kind, external, path } of imports) {
      if (external || initialFiles.has(path) || kind !== 'import-statement') {
        continue;
      }

      importedPaths.push(`${publicPath}${path}`);
    }

    entryPointToBundles[entryPoint] = importedPaths;
  }

  return entryPointToBundles;
}
