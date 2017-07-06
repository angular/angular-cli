/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {FileOperator, Rule} from '../engine/interface';
import {FileEntry} from '../tree/interface';
import {normalizePath} from '../utility/path';
import {forEach} from './base';


export function moveOp(from: string, to?: string): FileOperator {
  if (to === undefined) {
    to = from;
    from = '/';
  }

  const fromPath = normalizePath(from);
  const toPath = normalizePath(to);

  return (entry: FileEntry) => {
    if (entry.path.startsWith(fromPath)) {
      return {
        content: entry.content,
        path: normalizePath(toPath + '/' + entry.path.substr(fromPath.length)),
      };
    }

    return entry;
  };
}


export function move(from: string, to?: string): Rule {
  return forEach(moveOp(from, to));
}
