/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { FontsClass, OptimizationClass, OptimizationUnion } from '../browser/schema';

export type NormalizeOptimizationOptions = Required<Omit<OptimizationClass, 'fonts'>> & {
  fonts: FontsClass,
};

export function normalizeOptimization(optimization: OptimizationUnion = false): NormalizeOptimizationOptions {
  if (typeof optimization === 'object') {
    return {
      scripts: !!optimization.scripts,
      styles: !!optimization.styles,
      fonts: typeof optimization.fonts === 'object' ? optimization.fonts : {
        inline: !!optimization.fonts,
      },
    };
  }

  return {
    scripts: optimization,
    styles: optimization,
    fonts: {
      inline: optimization,
    },
  };
}
