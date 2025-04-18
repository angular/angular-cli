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
  // Read the browserslist configuration containing Angular's browser support policy.
  const angularBrowserslist = browserslist(undefined, {
    path: require.resolve('../../.browserslistrc'),
  });

  // Use Angular's configuration as the default.
  browserslist.defaults = angularBrowserslist;

  // Get the minimum set of browser versions supported by Angular.
  const minimumBrowsers = new Set(angularBrowserslist);

  // Get browsers from config or default.
  const browsersFromConfigOrDefault = new Set(browserslist(undefined, { path: projectRoot }));

  // Get browsers that support ES6 modules.
  const browsersThatSupportEs6 = new Set(browserslist('supports es6-module'));

  const nonEs6Browsers: string[] = [];
  const unsupportedBrowsers: string[] = [];
  for (const browser of browsersFromConfigOrDefault) {
    if (!browsersThatSupportEs6.has(browser)) {
      // Any browser which does not support ES6 is explicitly ignored, as Angular will not build successfully.
      browsersFromConfigOrDefault.delete(browser);
      nonEs6Browsers.push(browser);
    } else if (!minimumBrowsers.has(browser)) {
      // Any other unsupported browser we will attempt to use, but provide no support for.
      unsupportedBrowsers.push(browser);
    }
  }

  if (nonEs6Browsers.length) {
    logger.warn(
      `One or more browsers which are configured in the project's Browserslist configuration ` +
        'will be ignored as ES5 output is not supported by the Angular CLI.\n' +
        `Ignored browsers:\n${nonEs6Browsers.join(', ')}`,
    );
  }

  if (unsupportedBrowsers.length) {
    logger.warn(
      `One or more browsers which are configured in the project's Browserslist configuration ` +
        "fall outside Angular's browser support for this version.\n" +
        `Unsupported browsers:\n${unsupportedBrowsers.join(', ')}`,
    );
  }

  return Array.from(browsersFromConfigOrDefault);
}
