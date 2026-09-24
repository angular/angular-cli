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
import { AssetPattern, AssetPatternClass } from '../builders/browser/schema';
import { isDependencyPath, isWithinDirectory, resolveRealPath } from './asset-paths';

export class MissingAssetSourceRootException extends Error {
  constructor(path: string) {
    super(`The ${path} asset path must start with the project source root.`);
  }
}

export function normalizeAssetPatterns(
  assetPatterns: AssetPattern[],
  workspaceRoot: string,
  projectRoot: string,
  projectSourceRoot: string | undefined,
): (AssetPatternClass & { output: string })[] {
  if (assetPatterns.length === 0) {
    return [];
  }

  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const realWorkspaceRoot = resolveRealPath(resolvedWorkspaceRoot) ?? resolvedWorkspaceRoot;

  // When sourceRoot is not available, we default to ${projectRoot}/src.
  const sourceRoot = projectSourceRoot || path.join(projectRoot, 'src');
  const resolvedSourceRoot = path.resolve(workspaceRoot, sourceRoot);

  return assetPatterns.map((assetPattern) => {
    const inputPath = typeof assetPattern === 'string' ? assetPattern : assetPattern.input;
    const resolvedInput = path.resolve(workspaceRoot, inputPath);
    const realInput = resolveRealPath(resolvedInput);

    // Resolving a path only compares it textually, while a symbolic link resolves to its
    // target on disk. An input that appears to be inside the workspace root can therefore
    // still point outside of it. An input that cannot be resolved does not exist and has
    // nothing to read. An input that asks for a dependency is allowed to resolve out of the
    // workspace root, because that is where a package manager keeps one.
    if (
      !isWithinDirectory(resolvedWorkspaceRoot, resolvedInput) ||
      (realInput !== undefined &&
        !isDependencyPath(inputPath) &&
        !isWithinDirectory(realWorkspaceRoot, realInput))
    ) {
      throw new Error(`The ${inputPath} asset path must be within the workspace root.`);
    }

    // Normalize string asset patterns to objects.
    if (typeof assetPattern === 'string') {
      const assetPath = path.normalize(assetPattern);
      const resolvedAssetPath = path.resolve(workspaceRoot, assetPath);

      // Check if the string asset is within sourceRoot.
      if (!resolvedAssetPath.startsWith(resolvedSourceRoot)) {
        throw new MissingAssetSourceRootException(assetPattern);
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

      // Output directory for both is the relative path from source root to input.
      const output = path.relative(resolvedSourceRoot, path.resolve(workspaceRoot, input));

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
