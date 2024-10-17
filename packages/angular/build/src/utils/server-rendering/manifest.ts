/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  INDEX_HTML_CSR,
  INDEX_HTML_SERVER,
  NormalizedApplicationBuildOptions,
  getLocaleBaseHref,
} from '../../builders/application/options';
import type { BuildOutputFile } from '../../tools/esbuild/bundler-context';
import type { PrerenderedRoutesRecord } from '../../tools/esbuild/bundler-execution-result';

export const SERVER_APP_MANIFEST_FILENAME = 'angular-app-manifest.mjs';
export const SERVER_APP_ENGINE_MANIFEST_FILENAME = 'angular-app-engine-manifest.mjs';

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
 * @param baseHref - The base HREF for the application. This is used to set the base URL
 * for all relative URLs in the application.
 * @param perenderedRoutes - A record mapping static paths to their associated data.
 * @returns A string representing the content of the SSR server manifest for App Engine.
 */
export function generateAngularServerAppEngineManifest(
  i18nOptions: NormalizedApplicationBuildOptions['i18nOptions'],
  baseHref: string | undefined,
  perenderedRoutes: PrerenderedRoutesRecord | undefined = {},
): string {
  const entryPointsContent: string[] = [];

  if (i18nOptions.shouldInline) {
    for (const locale of i18nOptions.inlineLocales) {
      const importPath =
        './' + (i18nOptions.flatOutput ? '' : locale + '/') + MAIN_SERVER_OUTPUT_FILENAME;

      let localeWithBaseHref = getLocaleBaseHref('', i18nOptions, locale) || '/';

      // Remove leading and trailing slashes.
      const start = localeWithBaseHref[0] === '/' ? 1 : 0;
      const end = localeWithBaseHref[localeWithBaseHref.length - 1] === '/' ? -1 : undefined;
      localeWithBaseHref = localeWithBaseHref.slice(start, end);

      entryPointsContent.push(`['${localeWithBaseHref}', () => import('${importPath}')]`);
    }
  } else {
    entryPointsContent.push(`['', () => import('./${MAIN_SERVER_OUTPUT_FILENAME}')]`);
  }

  const staticHeaders: string[] = [];
  for (const [path, { headers }] of Object.entries(perenderedRoutes)) {
    if (!headers) {
      continue;
    }

    const headersValues: string[] = [];
    for (const [name, value] of Object.entries(headers)) {
      headersValues.push(`['${name}', '${encodeURIComponent(value)}']`);
    }

    staticHeaders.push(`['${path}', [${headersValues.join(', ')}]]`);
  }

  const manifestContent = `
export default {
  basePath: '${baseHref ?? '/'}',
  entryPoints: new Map([${entryPointsContent.join(', \n')}]),
  staticPathsHeaders: new Map([${staticHeaders.join(', \n')}]),
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
 *
 * @returns A string representing the content of the SSR server manifest for the Node.js
 * environment.
 */
export function generateAngularServerAppManifest(
  additionalHtmlOutputFiles: Map<string, BuildOutputFile>,
  outputFiles: BuildOutputFile[],
  inlineCriticalCss: boolean,
  routes: readonly unknown[] | undefined,
  locale: string | undefined,
): string {
  const serverAssetsContent: string[] = [];
  for (const file of [...additionalHtmlOutputFiles.values(), ...outputFiles]) {
    if (
      file.path === INDEX_HTML_SERVER ||
      file.path === INDEX_HTML_CSR ||
      (inlineCriticalCss && file.path.endsWith('.css'))
    ) {
      serverAssetsContent.push(`['${file.path}', async () => \`${escapeUnsafeChars(file.text)}\`]`);
    }
  }

  const manifestContent = `
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: ${inlineCriticalCss},
  routes: ${JSON.stringify(routes, undefined, 2)},
  assets: new Map([${serverAssetsContent.join(', \n')}]),
  locale: ${locale !== undefined ? `'${locale}'` : undefined},
};
`;

  return manifestContent;
}
