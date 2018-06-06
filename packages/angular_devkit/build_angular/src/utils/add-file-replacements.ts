/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException, Path, join, normalize, virtualFs } from '@angular-devkit/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
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

// Note: This method changes the file replacements in place.
export function addFileReplacements(
  root: Path,
  host: virtualFs.AliasHost,
  fileReplacements: FileReplacement[],
): Observable<null> {

  if (fileReplacements.length === 0) {
    return of(null);
  }

  // Normalize the legacy format into the current one.
  for (const fileReplacement of fileReplacements) {
    const currentFormat = fileReplacement as CurrentFileReplacement;
    const maybeOldFormat = fileReplacement as DeprecatedFileReplacment;

    if (maybeOldFormat.src && maybeOldFormat.replaceWith) {
      currentFormat.replace = maybeOldFormat.src;
      currentFormat.with = maybeOldFormat.replaceWith;
    }
  }

  const normalizedFileReplacements = fileReplacements as CurrentFileReplacement[];

  // Ensure all the replacements exist.
  const errorOnFalse = (path: string) => tap((exists: boolean) => {
    if (!exists) {
      throw new MissingFileReplacementException(path);
    }
  });

  const existObservables = normalizedFileReplacements
    .map(replacement => [
      host.exists(join(root, replacement.replace)).pipe(errorOnFalse(replacement.replace)),
      host.exists(join(root, replacement.with)).pipe(errorOnFalse(replacement.with)),
    ])
    .reduce((prev, curr) => prev.concat(curr), []);

  return forkJoin(existObservables).pipe(
    tap(() => {
      normalizedFileReplacements.forEach(replacement => {
        host.aliases.set(
          join(root, normalize(replacement.replace)),
          join(root, normalize(replacement.with)),
        );
      });
    }),
    map(() => null),
  );
}
