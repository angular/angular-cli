/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { coerce, compare, minVersion } from 'semver';

/**
 * Compares two target version strings.
 *
 * This function is used to determine the lowest version for a given browser target.
 *
 * @param a The first version string.
 * @param b The second version string.
 * @returns A negative value if `a` is lower than `b`, a positive value if `a` is higher than `b`, and 0 if they are equal.
 */
function compareTargetVersions(a: string, b: string): number {
  const aVersion = coerce(a);
  const bVersion = coerce(b);

  if (!aVersion || !bVersion) {
    return aVersion ? -1 : bVersion ? 1 : 0;
  }

  return compare(aVersion, bVersion);
}

// https://esbuild.github.io/api/#target
const ESBUILD_SUPPORTED_BROWSERS: ReadonlySet<string> = new Set([
  'chrome',
  'edge',
  'firefox',
  'ie',
  'ios',
  'node',
  'opera',
  'safari',
]);

/**
 * Transform browserlists result to esbuild target.
 *
 * Only the lowest version for each browser is returned to avoid issues with esbuild and rolldown
 * when multiple versions of the same target engine are specified.
 *
 * @see https://esbuild.github.io/api/#target
 * @see https://github.com/evanw/esbuild/issues/4509
 * @see https://github.com/rolldown/rolldown/issues/10633
 */
export function transformSupportedBrowsersToTargets(supportedBrowsers: string[]): string[] {
  const browsers = new Map<string, string>();

  for (const browser of supportedBrowsers) {
    let [browserName, version] = browser.toLowerCase().split(' ');
    if (!browserName || !version) {
      continue;
    }

    // browserslist uses the name `ios_saf` for iOS Safari whereas esbuild uses `ios`
    if (browserName === 'ios_saf') {
      browserName = 'ios';
    }

    if (!ESBUILD_SUPPORTED_BROWSERS.has(browserName)) {
      continue;
    }

    // browserslist uses ranges `15.2-15.3` versions but only the lowest is required
    // to perform minimum supported feature checks. esbuild also expects a single version.
    [version] = version.split('-');

    if (browserName === 'safari' && version === 'tp') {
      // esbuild only supports numeric versions so `TP` is converted to a high number (999) since
      // a Technology Preview (TP) of Safari is assumed to support all currently known features.
      version = '999';
    } else if (!version.includes('.')) {
      // A lone major version is considered by esbuild to include all minor versions. However,
      // browserslist does not and is also inconsistent in its `.0` version naming. For example,
      // Safari 15.0 is named `safari 15` but Safari 16.0 is named `safari 16.0`.
      version += '.0';
    }

    const current = browsers.get(browserName);
    if (!current || compareTargetVersions(version, current) < 0) {
      browsers.set(browserName, version);
    }
  }

  return Array.from(browsers, ([browserName, version]) => browserName + version);
}

const SUPPORTED_NODE_VERSIONS = '0.0.0-ENGINES-NODE';

/**
 * Transform supported Node.js versions to esbuild target.
 *
 * Only the lowest Node.js version is returned to avoid issues with esbuild and rolldown
 * when multiple versions of the same target engine are specified.
 *
 * @see https://esbuild.github.io/api/#target
 * @see https://github.com/evanw/esbuild/issues/4509
 * @see https://github.com/rolldown/rolldown/issues/10633
 */
export function getSupportedNodeTargets(): string[] {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0') {
    // Unlike `pkg_npm`, `ts_library` which is used to run unit tests does not support substitutions.
    return [];
  }

  const parsed = minVersion(SUPPORTED_NODE_VERSIONS);

  return parsed ? ['node' + parsed.version] : [];
}
