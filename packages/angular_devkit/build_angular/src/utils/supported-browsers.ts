/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import browserslist from 'browserslist';

export function getSupportedBrowsers(projectRoot: string, logger: logging.LoggerApi): string[] {
  browserslist.defaults = [
    'last 1 Chrome version',
    'last 1 Firefox version',
    'last 2 Edge major versions',
    'last 2 Safari major versions',
    'last 2 iOS major versions',
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
