/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SourceMapOptions } from '../browser/schema';

export interface NormalizedSourceMaps {
  sourceMap: boolean;
  scriptsSourceMap: boolean;
  stylesSourceMap: boolean;
  hiddenSourceMap: boolean;
  vendorSourceMap: boolean;
}

export function normalizeSourceMaps(sourceMap: SourceMapOptions): NormalizedSourceMaps {
  const scriptsSourceMap = !!(typeof sourceMap === 'object' ? sourceMap.scripts : sourceMap);
  const stylesSourceMap = !!(typeof sourceMap === 'object' ? sourceMap.styles : sourceMap);
  const hiddenSourceMap = typeof sourceMap === 'object' && !!sourceMap.hidden;
  const vendorSourceMap = typeof sourceMap === 'object' && !!sourceMap.vendor;

  return {
    sourceMap: stylesSourceMap || scriptsSourceMap,
    vendorSourceMap,
    hiddenSourceMap,
    scriptsSourceMap,
    stylesSourceMap,
  };
}
