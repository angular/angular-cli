/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import browserslist from 'browserslist';

export function getSupportedBrowsers(
  projectRoot: string,
  logger: { warn(message: string): void },
): string[] {
  // This list should match the last 2 versions of the browsers we support at the release.
  browserslist.defaults = [
    'Chrome >= 127',
    'Edge >= 127',
    'Firefox >= 129',
    'Safari >= 16',
    'ios >= 16',
    'Android >= 127',
    'Firefox ESR',
  ];

  // Get browsers from config or default.
  const browsersFromConfigOrDefault = new Set(browserslist(undefined, { path: projectRoot }));

  // Get browsers that support ES6 modules.
  const browsersThatSupportEs6 = new Set(browserslist('supports es6-module'));

  const unsupportedBrowsers: string[] = [];
  for (const browser of browsersFromConfigOrDefault) {
    if (!browsersThatSupportEs6.has(browser)) {
      browsersFromConfigOrDefault.delete(browser);
      unsupportedBrowsers.push(browser);
    }
  }

  if (unsupportedBrowsers.length) {
    logger.warn(
      `One or more browsers which are configured in the project's Browserslist configuration ` +
        'will be ignored as ES5 output is not supported by the Angular CLI.\n' +
        `Ignored browsers: ${unsupportedBrowsers.join(', ')}`,
    );
  }

  return Array.from(browsersFromConfigOrDefault);
}
