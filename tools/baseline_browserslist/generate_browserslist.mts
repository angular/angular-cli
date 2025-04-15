/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getCompatibleVersions } from 'baseline-browser-mapping';

// Map `baseline-browser-mapping` browsers to `browserslist` browsers.
const browsers: Record<string, string> = {
  chrome: 'Chrome',
  chrome_android: 'ChromeAndroid',
  edge: 'Edge',
  firefox: 'Firefox',
  firefox_android: 'FirefoxAndroid',
  safari: 'Safari',
  safari_ios: 'iOS',
};

/**
 * Generates the `browserslist` configuration for the given Baseline date.
 *
 * @param date The Baseline "widely available" date to generate a `browserslist`
 *     configuration for. Uses `YYYY-MM-DD` format.
 * @returns The `browserslist` configuration file content.
 */
export function generateBrowserslist(date: string): string {
  // Generate a `browserslist` configuration.
  return getCompatibleVersions({
    widelyAvailableOnDate: date,
    includeDownstreamBrowsers: false,
  })
    .filter(({ browser }) => browsers[browser])
    .map(({ browser, version }) => `${browsers[browser]} >= ${version}`)
    .join('\n');
}
