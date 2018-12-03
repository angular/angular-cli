/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { OptimizationOptions, SourceMapOptions } from '../browser/schema';

export interface NormalizedOptimization {
  scripts: boolean;
  styles: boolean;
}

export function normalizeOptimization(optimization: OptimizationOptions): NormalizedOptimization {
  const scripts = !!(typeof optimization === 'object' ? optimization.scripts : optimization);
  const styles = !!(typeof optimization === 'object' ? optimization.styles : optimization);

  return {
    scripts,
    styles,
  };
}
