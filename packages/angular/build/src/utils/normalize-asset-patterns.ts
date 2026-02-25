/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { statSync } from 'node:fs';
import * as path from 'node:path';
import { AssetPattern, AssetPatternClass } from '../builders/application/schema';

export function normalizeAssetPatterns(
  assetPatterns: AssetPattern[],
  workspaceRoot: string,
  projectRoot: string,
  projectSourceRoot: string | undefined,
): (AssetPatternClass & { output: string })[] {
  if (assetPatterns.length === 0) {
    return [];
  }

  // When sourceRoot is not available, we default to ${projectRoot}/src.
  const sourceRoot = projectSourceRoot || path.join(projectRoot, 'src');
  const resolvedSourceRoot = path.resolve(workspaceRoot, sourceRoot);
  const resolvedProjectRoot = path.resolve(workspaceRoot, projectRoot);

  return assetPatterns.map((assetPattern) => {
    // Normalize string asset patterns to objects.
    if (typeof assetPattern === 'string') {
      const assetPath = path.normalize(assetPattern);
      const resolvedAssetPath = path.resolve(workspaceRoot, assetPath);
      let root: string;

      // Check if the string asset is within sourceRoot.
      if (resolvedAssetPath.startsWith(resolvedSourceRoot)) {
        root = resolvedSourceRoot;
      } else if (resolvedAssetPath.startsWith(resolvedProjectRoot)) {
        root = resolvedProjectRoot;
      } else if (resolvedAssetPath.startsWith(workspaceRoot)) {
        root = workspaceRoot;
      } else {
        throw new Error(`The ${assetPattern} asset path must be within the workspace root.`);
      }

      let glob: string, input: string;
      let isDirectory: boolean;

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

      // Output directory for both is the relative path from the root to input.
      const output = path.relative(root, path.resolve(workspaceRoot, input));

      assetPattern = { glob, input, output };
    } else {
      assetPattern.output = path.join('.', assetPattern.output ?? '');
    }

    assert(assetPattern.output !== undefined);

    if (assetPattern.output.startsWith('..')) {
      throw new Error('An asset cannot be written to a location outside of the output path.');
    }

    return assetPattern as AssetPatternClass & { output: string };
  });
}
