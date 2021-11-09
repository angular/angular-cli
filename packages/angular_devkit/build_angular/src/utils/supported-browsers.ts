/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import browserslist from 'browserslist';

export function getSupportedBrowsers(projectRoot: string): string[] {
  browserslist.defaults = [
    'last 1 Chrome version',
    'last 1 Firefox version',
    'last 2 Edge major versions',
    'last 2 Safari major versions',
    'last 2 iOS major versions',
    'Firefox ESR',
  ];

  return browserslist(undefined, { path: projectRoot });
}
