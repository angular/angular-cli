/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BaseException,
  Path,
  getSystemPath,
  join,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { Observable, from, of } from 'rxjs';
import { concat, concatMap, ignoreElements, map, mergeMap, tap, toArray } from 'rxjs/operators';
import {
  CurrentFileReplacement,
  DeprecatedFileReplacment,
  FileReplacement,
} from '../browser/schema';


export class MissingFileReplacementException extends BaseException {
  constructor(path: String) {
    super(`The ${path} path in file replacements does not exist.`);
  }
}

export interface NormalizedFileReplacement {
  replace: Path;
  with: Path;
}

export function normalizeFileReplacements(
  fileReplacements: FileReplacement[],
  host: virtualFs.Host,
  root: Path,
): Observable<NormalizedFileReplacement[]> {
  if (fileReplacements.length === 0) {
    return of([]);
  }

  // Ensure all the replacements exist.
  const errorOnFalse = (path: Path) => tap((exists: boolean) => {
    if (!exists) {
      throw new MissingFileReplacementException(getSystemPath(path));
    }
  });

  return from(fileReplacements).pipe(
    map(replacement => normalizeFileReplacement(replacement, root)),
    concatMap(normalized => {
      return from([normalized.replace, normalized.with]).pipe(
        mergeMap(path => host.exists(path).pipe(errorOnFalse(path))),
        ignoreElements(),
        concat(of(normalized)),
      );
    }),
    toArray(),
  );
}

function normalizeFileReplacement(
  fileReplacement: FileReplacement,
  root?: Path,
): NormalizedFileReplacement {
  const currentFormat = fileReplacement as CurrentFileReplacement;
  const maybeOldFormat = fileReplacement as DeprecatedFileReplacment;

  let replacePath: Path;
  let withPath: Path;
  if (maybeOldFormat.src && maybeOldFormat.replaceWith) {
    replacePath = normalize(maybeOldFormat.src);
    withPath = normalize(maybeOldFormat.replaceWith);
  } else {
    replacePath = normalize(currentFormat.replace);
    withPath = normalize(currentFormat.with);
  }

  // TODO: For 7.x should this only happen if not absolute?
  if (root) {
    replacePath = join(root, replacePath);
  }
  if (root) {
    withPath = join(root, withPath);
  }

  return { replace: replacePath, with: withPath };
}
