/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'esbuild';
import { createProjectResolver } from '../../utils/resolve-project';
import {
  LOCALE_DATA_NAMESPACE,
  type LoadedLocaleData,
  type LocaleDataResolution,
  loadLocaleData,
  resolveLocaleDataPath,
} from '../i18n/locale-data';

export {
  LOCALE_DATA_NAMESPACE,
  LOCALE_DATA_BASE_MODULE,
  type LoadedLocaleData,
  type LocaleDataResolution,
  loadLocaleData,
  resolveLocaleDataPath,
} from '../i18n/locale-data';

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
