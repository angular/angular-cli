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
  basename,
  dirname,
  join,
  normalize,
  relative,
  resolve,
  virtualFs,
} from '@angular-devkit/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AssetPattern, AssetPatternObject } from '../browser/schema';


export class MissingAssetSourceRootException extends BaseException {
  constructor(path: String) {
    super(`The ${path} asset path must start with the project source root.`);
  }
}

export function normalizeAssetPatterns(
  assetPatterns: AssetPattern[],
  host: virtualFs.Host,
  root: Path,
  projectRoot: Path,
  maybeSourceRoot: Path | undefined,
): Observable<AssetPatternObject[]> {
  // When sourceRoot is not available, we default to ${projectRoot}/src.
  const sourceRoot = maybeSourceRoot || join(projectRoot, 'src');
  const resolvedSourceRoot = resolve(root, sourceRoot);

  if (assetPatterns.length === 0) {
    // If there are no asset patterns, return an empty array.
    // It's important to do this because forkJoin with an empty array will immediately complete
    // the observable.
    return of([]);
  }

  const assetPatternObjectObservables: Observable<AssetPatternObject>[] = assetPatterns
    .map(assetPattern => {
      // Normalize string asset patterns to objects.
      if (typeof assetPattern === 'string') {
        const assetPath = normalize(assetPattern);
        const resolvedAssetPath = resolve(root, assetPath);

        // Check if the string asset is within sourceRoot.
        if (!resolvedAssetPath.startsWith(resolvedSourceRoot)) {
          throw new MissingAssetSourceRootException(assetPattern);
        }

        return host.isDirectory(resolvedAssetPath).pipe(
          // If the path doesn't exist at all, pretend it is a directory.
          catchError(() => of(true)),
          map(isDirectory => {
            let glob: string, input: Path, output: Path;
            if (isDirectory) {
              // Folders get a recursive star glob.
              glob = '**/*';
              // Input directory is their original path.
              input = assetPath;
            } else {
              // Files are their own glob.
              glob = basename(assetPath);
              // Input directory is their original dirname.
              input = dirname(assetPath);
            }

            // Output directory for both is the relative path from source root to input.
            output = relative(resolvedSourceRoot, resolve(root, input));

            // Return the asset pattern in object format.
            return { glob, input, output };
          }),
        );
      } else {
        // It's already an AssetPatternObject, no need to convert.
        return of(assetPattern);
      }
    });

  // Wait for all the asset patterns and return them as an array.
  return forkJoin(assetPatternObjectObservables);
}
