/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  FontsClass,
  OptimizationClass,
  OptimizationUnion,
  StylesClass,
} from '../builders/application/schema';

export type NormalizedOptimizationOptions = Required<
  Omit<OptimizationClass, 'fonts' | 'styles'>
> & {
  fonts: FontsClass;
  styles: StylesClass;
};

export function normalizeOptimization(
  optimization: OptimizationUnion = true,
): NormalizedOptimizationOptions {
  if (typeof optimization === 'object') {
    const styleOptimization = !!optimization.styles;

    return {
      scripts: !!optimization.scripts,
      styles:
        typeof optimization.styles === 'object'
          ? optimization.styles
          : {
              minify: styleOptimization,
              removeSpecialComments: styleOptimization,
              inlineCritical: styleOptimization,
            },
      fonts:
        typeof optimization.fonts === 'object'
          ? optimization.fonts
          : {
              inline: !!optimization.fonts,
            },
    };
  }

  return {
    scripts: optimization,
    styles: {
      minify: optimization,
      inlineCritical: optimization,
      removeSpecialComments: optimization,
    },
    fonts: {
      inline: optimization,
    },
  };
}
