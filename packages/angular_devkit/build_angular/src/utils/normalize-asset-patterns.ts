/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
import { statSync } from 'fs';
import * as path from 'path';
import { AssetPattern, AssetPatternClass } from '../builders/browser/schema';

export class MissingAssetSourceRootException extends BaseException {
  constructor(path: String) {
    super(`The ${path} asset path must start with the project source root.`);
  }
}

export function normalizeAssetPatterns(
  assetPatterns: AssetPattern[],
  workspaceRoot: string,
  projectRoot: string,
  projectSourceRoot: string | undefined,
): AssetPatternClass[] {
  if (assetPatterns.length === 0) {
    return [];
  }

  // When sourceRoot is not available, we default to ${projectRoot}/src.
  const sourceRoot = projectSourceRoot || path.join(projectRoot, 'src');
  const resolvedSourceRoot = path.resolve(workspaceRoot, sourceRoot);

  return assetPatterns.map((assetPattern) => {
    // Normalize string asset patterns to objects.
    if (typeof assetPattern === 'string') {
      const assetPath = path.normalize(assetPattern);
      const resolvedAssetPath = path.resolve(workspaceRoot, assetPath);

      // Check if the string asset is within sourceRoot.
      if (!resolvedAssetPath.startsWith(resolvedSourceRoot)) {
        throw new MissingAssetSourceRootException(assetPattern);
      }

      let glob: string, input: string;
      let isDirectory = false;

      try {
        isDirectory = statSync(resolvedAssetPath).isDirectory();
      } catch {
        isDirectory = true;
      }

      if (isDirectory) {
        // Folders get a recursive star glob.
        glob = '**/*';
        // Input directory is their original path.
        input = assetPath;
      } else {
        // Files are their own glob.
        glob = path.basename(assetPath);
        // Input directory is their original dirname.
        input = path.dirname(assetPath);
      }

      // Output directory for both is the relative path from source root to input.
      const output = path.relative(resolvedSourceRoot, path.resolve(workspaceRoot, input));

      // Return the asset pattern in object format.
      return { glob, input, output };
    } else {
      // It's already an AssetPatternObject, no need to convert.
      return assetPattern;
    }
  });
}
