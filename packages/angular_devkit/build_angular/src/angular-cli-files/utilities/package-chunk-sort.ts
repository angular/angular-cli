/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import { ExtraEntryPoint } from '../../browser/schema';
import { normalizeExtraEntryPoints } from '../models/webpack-configs/utils';

export function generateEntryPoints(appConfig: any) {
  let entryPoints = ['polyfills', 'sw-register'];

  // Add all styles/scripts, except lazy-loaded ones.
  [
    ...normalizeExtraEntryPoints(appConfig.styles as ExtraEntryPoint[], 'styles')
      .filter(entry => !entry.lazy)
      .map(entry => entry.bundleName),
    ...normalizeExtraEntryPoints(appConfig.scripts as ExtraEntryPoint[], 'scripts')
      .filter(entry => !entry.lazy)
      .map(entry => entry.bundleName),
  ].forEach(bundleName => {
    if (entryPoints.indexOf(bundleName) === -1) {
      entryPoints.push(bundleName);
    }
  });

  entryPoints.push('main');

  return entryPoints;
}

// Sort chunks according to a predefined order:
// inline, polyfills, all styles, vendor, main
export function packageChunkSort(appConfig: any) {
  const entryPoints = generateEntryPoints(appConfig);

  function sort(left: any, right: any) {
    let leftIndex = entryPoints.indexOf(left.names[0]);
    let rightindex = entryPoints.indexOf(right.names[0]);

    if (leftIndex > rightindex) {
      return 1;
    } else if (leftIndex < rightindex) {
      return -1;
    } else {
      return 0;
    }
  }

  // We need to list of entry points for the Ejected webpack config to work (we reuse the function
  // defined above).
  (sort as any).entryPoints = entryPoints;
  return sort;
}
