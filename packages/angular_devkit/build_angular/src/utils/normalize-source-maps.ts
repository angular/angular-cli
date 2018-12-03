/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SourceMapOptions } from '../browser/schema';

export interface NormalizedSourceMaps {
  scripts: boolean;
  styles: boolean;
  hidden: boolean;
  vendor: boolean;
}

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
