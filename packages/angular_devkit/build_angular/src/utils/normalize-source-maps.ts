/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { NormalizedSourceMaps, SourceMapOptions } from '../browser/schema';

export function normalizeSourceMaps(sourceMap: SourceMapOptions): NormalizedSourceMaps {
  const scripts = !!(typeof sourceMap === 'object' ? sourceMap.scripts : sourceMap);
  const styles = !!(typeof sourceMap === 'object' ? sourceMap.styles : sourceMap);
  const hidden = typeof sourceMap === 'object' && !!sourceMap.hidden;
  const vendor = typeof sourceMap === 'object' && !!sourceMap.vendor;

  return {
    vendor,
    hidden,
    scripts,
    styles,
  };
}
