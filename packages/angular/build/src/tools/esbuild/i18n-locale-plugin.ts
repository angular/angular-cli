/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createProjectResolver } from '../../utils/resolve-project';

/**
 * The internal namespace used by generated locale import statements and Angular locale data plugin.
 */
export const LOCALE_DATA_NAMESPACE = 'angular:locale/data';

/**
 * The base module location used to search for locale specific data.
 */
export const LOCALE_DATA_BASE_MODULE = '@angular/common/locales/global';

/**
 * Result of resolving locale data for a given locale tag.
 */
export interface LocaleDataResolution {
  path?: string;
  warning?: string;
  error?: string;
}

/**
 * Result of loading locale data for a given locale tag.
 */
export interface LoadedLocaleData {
  code?: string;
  warning?: string;
  error?: string;
}

const localeDataCache = new Map<string, Promise<LoadedLocaleData>>();

/**
 * Resolves the path to the Angular locale data file for a given locale tag.
 *
 * @param rawLocaleTag The raw locale identifier (e.g. "fr-CA", "de", "en-US").
 * @param projectResolve A function that attempts to resolve a path string to an absolute file path.
 * @returns Resolution result with file path, or warning/error diagnostics if applicable.
 */
export function resolveLocaleDataPath(
  rawLocaleTag: string,
  projectResolve: (potentialPath: string) => string | undefined,
): LocaleDataResolution {
  let partialLocaleTag: string;
  try {
    const locale = new Intl.Locale(rawLocaleTag);
    partialLocaleTag = locale.baseName;
  } catch {
    return {
      error: `Invalid or unsupported locale provided in configuration: "${rawLocaleTag}"`,
    };
  }

  let exact = true;
  while (partialLocaleTag) {
    // Angular embeds the `en`/`en-US` locale into the framework and it does not need to be included again here.
    if (partialLocaleTag === 'en' || partialLocaleTag === 'en-US') {
      return {};
    }

    const potentialPath = `${LOCALE_DATA_BASE_MODULE}/${partialLocaleTag}`;
    try {
      const resolvedPath = projectResolve(potentialPath);
      if (resolvedPath) {
        return {
          path: resolvedPath,
          warning: exact
            ? undefined
            : `Locale data for '${rawLocaleTag}' cannot be found. Using locale data for '${partialLocaleTag}'.`,
        };
      }
    } catch {}

    // Remove the last subtag and try again with a less specific locale.
    const parts = partialLocaleTag.split('-');
    partialLocaleTag = parts.slice(0, -1).join('-');
    exact = false;
  }

  return {
    warning: `Locale data for '${rawLocaleTag}' cannot be found. No locale data will be included for this locale.`,
  };
}

/**
 * Loads the Angular global locale data script for a specified locale tag.
 *
 * @param rawLocaleTag The raw locale identifier (e.g. "fr-CA", "de", "en-US").
 * @param projectRoot Optional project root for module resolution.
 * @returns A promise resolving to the loaded locale data script code and any diagnostic warnings.
 */
export function loadLocaleData(
  rawLocaleTag: string,
  projectRoot?: string,
): Promise<LoadedLocaleData> {
  let cached = localeDataCache.get(rawLocaleTag);
  if (!cached) {
    cached = (async () => {
      const projectResolve = createProjectResolver(projectRoot ?? process.cwd());
      const resolution = resolveLocaleDataPath(rawLocaleTag, (potentialPath) => {
        try {
          return projectResolve(potentialPath);
        } catch {
          return undefined;
        }
      });

      if (resolution.error) {
        return { error: resolution.error };
      }

      if (resolution.path) {
        try {
          const code = await readFile(resolution.path, 'utf8');

          return { code, warning: resolution.warning };
        } catch (e) {
          return { error: `Failed to read locale data file: ${(e as Error).message}` };
        }
      }

      return { warning: resolution.warning };
    })();

    localeDataCache.set(rawLocaleTag, cached);
  }

  return cached;
}

/**
 * Creates an esbuild plugin that resolves Angular locale data files from `@angular/common`.
 *
 * @returns An esbuild plugin.
 */
export function createAngularLocaleDataPlugin(): Plugin {
  return {
    name: 'angular-locale-data',
    setup(build): void {
      build.onResolve({ filter: /^angular:locale\/data:/ }, async ({ path }) => {
        const rawLocaleTag = path.split(':', 3)[2];
        const { absWorkingDir } = build.initialOptions;
        let projectResolve: ((packageName: string) => string) | undefined;

        const resolution = resolveLocaleDataPath(rawLocaleTag, (potentialPath) => {
          projectResolve ??= createProjectResolver(absWorkingDir ?? process.cwd());
          try {
            return projectResolve(potentialPath);
          } catch {
            return undefined;
          }
        });

        if (resolution.error) {
          return {
            path: rawLocaleTag,
            namespace: LOCALE_DATA_NAMESPACE,
            errors: [{ text: resolution.error }],
          };
        }

        if (!resolution.path) {
          return {
            path: rawLocaleTag,
            namespace: LOCALE_DATA_NAMESPACE,
            warnings: resolution.warning
              ? [{ location: null, text: resolution.warning }]
              : undefined,
          };
        }

        return {
          path: resolution.path,
          warnings: resolution.warning ? [{ location: null, text: resolution.warning }] : undefined,
        };
      });

      // Locales that cannot be found or are en/en-US will be loaded as empty content
      build.onLoad({ filter: /./, namespace: LOCALE_DATA_NAMESPACE }, () => ({
        contents: '',
        loader: 'empty',
      }));
    },
  };
}
