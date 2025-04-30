/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { parse as parseGlob } from 'picomatch';
import { Path } from '../path';
import { ResolverHost } from './resolver';

export type ReplacementFunction = (path: Path) => Path;

/**
 */
export class PatternMatchingHost<StatsT extends object = {}> extends ResolverHost<StatsT> {
  protected _patterns: Map<RegExp, ReplacementFunction> = new Map();

  addPattern(pattern: string | string[], replacementFn: ReplacementFunction): void {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    for (const glob of patterns) {
      const { output } = parseGlob(glob);
      this._patterns.set(new RegExp(`^${output}$`), replacementFn);
    }
  }

  protected _resolve(path: Path): Path {
    let newPath = path;
    this._patterns.forEach((fn, re) => {
      if (re.test(path)) {
        newPath = fn(newPath);
      }
    });

    return newPath;
  }
}
