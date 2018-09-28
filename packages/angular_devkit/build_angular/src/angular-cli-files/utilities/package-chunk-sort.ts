/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ExtraEntryPoint } from '../../browser/schema';
import { normalizeExtraEntryPoints } from '../models/webpack-configs/utils';

export function generateEntryPoints(
  appConfig: { styles: ExtraEntryPoint[], scripts: ExtraEntryPoint[] },
) {
  const entryPoints = ['polyfills', 'sw-register'];

  // Add all styles/scripts, except lazy-loaded ones.
  [
    ...normalizeExtraEntryPoints(appConfig.styles, 'styles')
      .filter(entry => !entry.lazy)
      .map(entry => entry.bundleName),
    ...normalizeExtraEntryPoints(appConfig.scripts, 'scripts')
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
