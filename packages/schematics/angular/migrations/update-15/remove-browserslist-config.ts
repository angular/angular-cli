/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Path, join } from '@angular-devkit/core';
import { DirEntry, Rule } from '@angular-devkit/schematics';

const validBrowserslistConfigFilenames = new Set(['browserslist', '.browserslistrc']);

export const DEFAULT_BROWSERS = [
  'last 1 Chrome version',
  'last 1 Firefox version',
  'last 2 Edge major versions',
  'last 2 Safari major versions',
  'last 2 iOS major versions',
  'Firefox ESR',
];

function* visit(directory: DirEntry): IterableIterator<Path> {
  for (const path of directory.subfiles) {
    if (validBrowserslistConfigFilenames.has(path)) {
      yield join(directory.path, path);
    }
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules') {
      continue;
    }

    yield* visit(directory.dir(path));
  }
}

export default function (): Rule {
  return async (tree, { logger }) => {
    let browserslist: typeof import('browserslist') | undefined;

    try {
      browserslist = (await import('browserslist')).default;
    } catch {
      logger.warn('Skipping migration because the "browserslist" package could not be loaded.');

      return;
    }

    // Set the defaults to match the defaults in build-angular.
    browserslist.defaults = DEFAULT_BROWSERS;

    const defaultSupportedBrowsers = new Set(browserslist(DEFAULT_BROWSERS));
    const es5Browsers = new Set(browserslist(['supports es6-module']));

    for (const path of visit(tree.root)) {
      const { defaults: browsersListConfig, ...otherConfigs } = browserslist.parseConfig(
        tree.readText(path),
      );

      if (Object.keys(otherConfigs).length) {
        // The config contains additional sections.
        continue;
      }

      const browserslistInProject = browserslist(
        // Exclude from the list ES5 browsers which are not supported.
        browsersListConfig.map((s) => `${s} and supports es6-module`),
        {
          ignoreUnknownVersions: true,
        },
      );

      if (defaultSupportedBrowsers.size !== browserslistInProject.length) {
        continue;
      }

      const shouldDelete = browserslistInProject.every((browser) =>
        defaultSupportedBrowsers.has(browser),
      );

      if (shouldDelete) {
        // All browsers are the same as the default config.
        // Delete file as it's redundant.
        tree.delete(path);
      }
    }
  };
}
