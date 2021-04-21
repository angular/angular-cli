/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { FontsClass, OptimizationClass, OptimizationUnion, StylesClass } from '../browser/schema';

export type NormalizedOptimizationOptions = Required<Omit<OptimizationClass, 'fonts' | 'styles'>> & {
  fonts: FontsClass,
  styles: StylesClass,
};

export function normalizeOptimization(optimization: OptimizationUnion = true): NormalizedOptimizationOptions {
  if (typeof optimization === 'object') {
    return {
      scripts: !!optimization.scripts,
      styles: typeof optimization.styles === 'object' ? optimization.styles : {
        minify: !!optimization.styles,
        inlineCritical: !!optimization.styles,
      },
      fonts: typeof optimization.fonts === 'object' ? optimization.fonts : {
        inline: !!optimization.fonts,
      },
    };
  }

  return {
    scripts: optimization,
    styles: {
      minify: optimization,
      inlineCritical: optimization,
    },
    fonts: {
      inline: optimization,
    },
  };
}
