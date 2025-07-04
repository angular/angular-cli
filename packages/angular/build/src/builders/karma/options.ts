/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Schema as KarmaBuilderOptions } from './schema';

export type NormalizedKarmaBuilderOptions = Awaited<ReturnType<typeof normalizeOptions>>;

export function normalizeOptions(options: KarmaBuilderOptions) {
  const { watch = true, include = [], exclude = [], reporters = [], browsers, ...rest } = options;

  let normalizedBrowsers: string[] | undefined;
  if (typeof options.browsers === 'string' && options.browsers) {
    normalizedBrowsers = options.browsers.split(',').map((browser) => browser.trim());
  } else if (options.browsers === false) {
    normalizedBrowsers = [];
  }

  // Split along commas to make it more natural, and remove empty strings.
  const normalizedReporters = reporters
    .reduce<string[]>((acc, curr) => acc.concat(curr.split(',')), [])
    .filter((x) => !!x);

  return {
    reporters: normalizedReporters.length ? normalizedReporters : undefined,
    browsers: normalizedBrowsers,
    watch,
    include,
    exclude,
    ...rest,
  };
}
