/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path } from '../path';
import { ResolverHost } from './resolver';


export type ReplacementFunction = (path: Path) => Path;


/**
 */
export class PatternMatchingHost<StatsT extends object = {}> extends ResolverHost<StatsT> {
  protected _patterns = new Map<RegExp, ReplacementFunction>();

  addPattern(pattern: string | string[], replacementFn: ReplacementFunction) {
    // Simple GLOB pattern replacement.
    const reString = '^('
      + (Array.isArray(pattern) ? pattern : [pattern])
        .map(ex => '('
          + ex.split(/[\/\\]/g).map(f => f
            .replace(/[\-\[\]{}()+?.^$|]/g, '\\$&')
            .replace(/^\*\*/g, '(.+?)?')
            .replace(/\*/g, '[^/\\\\]*'))
            .join('[\/\\\\]')
          + ')')
        .join('|')
      + ')($|/|\\\\)';

    this._patterns.set(new RegExp(reString), replacementFn);
  }

  protected _resolve(path: Path) {
    let newPath = path;
    this._patterns.forEach((fn, re) => {
      if (re.test(path)) {
        newPath = fn(newPath);
      }
    });

    return newPath;
  }
}
