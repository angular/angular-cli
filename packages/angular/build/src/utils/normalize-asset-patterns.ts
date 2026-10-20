/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { statSync } from 'node:fs';
import path from 'node:path';
import type { AssetPattern, AssetPatternClass } from '../builders/application/schema';
import { isSubDirectory } from './path';

/**
 * Asset pattern configuration normalized into its object form with a resolved `output` directory.
 */
export interface NormalizedAssetsPattern extends AssetPatternClass {
  /** Relative output directory within the build output path. */
  output: string;
}

/**
 * Normalizes raw string and object asset patterns into {@link NormalizedAssetsPattern} objects
 * and validates that all asset inputs and outputs stay within the workspace and output directories.
 *
 * @param assetPatterns Raw string or object asset patterns from builder options.
 * @param workspaceRoot Workspace root directory path.
 * @param projectRoot Project root directory path.
 * @param projectSourceRoot Optional project source root directory path.
 * @returns An array of normalized asset pattern configurations.
 */
export function normalizeAssetPatterns(
  assetPatterns: AssetPattern[],
  workspaceRoot: string,
  projectRoot: string,
  projectSourceRoot: string | undefined,
): NormalizedAssetsPattern[] {
  if (assetPatterns.length === 0) {
    return [];
  }

  // When sourceRoot is not available, we default to ${projectRoot}/src.
  const sourceRoot = projectSourceRoot || path.join(projectRoot, 'src');
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  const resolvedSourceRoot = path.resolve(resolvedWorkspaceRoot, sourceRoot);
  const resolvedProjectRoot = path.resolve(resolvedWorkspaceRoot, projectRoot);

  return assetPatterns.map((assetPattern) => {
    let normalized: NormalizedAssetsPattern;

    // Normalize string asset patterns to objects.
    if (typeof assetPattern === 'string') {
      const assetPath = path.normalize(assetPattern);
      const resolvedAssetPath = path.resolve(resolvedWorkspaceRoot, assetPath);
      let root: string;

      // Check if the string asset is within sourceRoot.
      if (isSubDirectory(resolvedSourceRoot, resolvedAssetPath)) {
        root = resolvedSourceRoot;
      } else if (isSubDirectory(resolvedProjectRoot, resolvedAssetPath)) {
        root = resolvedProjectRoot;
      } else if (isSubDirectory(resolvedWorkspaceRoot, resolvedAssetPath)) {
        root = resolvedWorkspaceRoot;
      } else {
        throw new Error(`The ${assetPattern} asset path must be within the workspace root.`);
      }

      let isDirectory = true;
      try {
        isDirectory = statSync(resolvedAssetPath, { throwIfNoEntry: false })?.isDirectory() ?? true;
      } catch {}
      const glob = isDirectory ? '**/*' : path.basename(assetPath);
      const input = isDirectory ? assetPath : path.dirname(assetPath);

      // Output directory for both is the relative path from the root to input.
      const output = path.relative(root, path.resolve(resolvedWorkspaceRoot, input));

      normalized = { glob, input, output };
    } else {
      if (!isSubDirectory(resolvedWorkspaceRoot, assetPattern.input)) {
        throw new Error(`The ${assetPattern.input} asset path must be within the workspace root.`);
      }

      normalized = {
        ...assetPattern,
        output: path.join('.', assetPattern.output ?? ''),
      };
    }

    if (normalized.output.startsWith('..')) {
      throw new Error('An asset cannot be written to a location outside of the output path.');
    }

    return normalized;
  });
}
