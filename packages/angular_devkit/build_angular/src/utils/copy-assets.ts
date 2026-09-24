/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'tinyglobby';
import { isDependencyPath, isWithinDirectory, resolveRealPath } from './asset-paths';

export async function copyAssets(
  entries: {
    glob: string;
    ignore?: string[];
    input: string;
    output: string;
    flatten?: boolean;
    followSymlinks?: boolean;
  }[],
  basePaths: Iterable<string>,
  root: string,
  changed?: Set<string>,
) {
  const defaultIgnore = ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'];

  const outputFiles: { source: string; destination: string }[] = [];
  const resolvedRoot = path.resolve(root);
  const realRoot = resolveRealPath(resolvedRoot) ?? resolvedRoot;

  for (const entry of entries) {
    const cwd = path.resolve(root, entry.input);

    // An input that asks for a dependency is allowed to resolve out of the workspace root,
    // and what it resolves to becomes the boundary for its own matches instead.
    const dependencyRoot = isDependencyPath(entry.input) ? resolveRealPath(cwd) : undefined;
    const files = await glob(entry.glob, {
      cwd,
      dot: true,
      ignore: entry.ignore ? defaultIgnore.concat(entry.ignore) : defaultIgnore,
      // Schema defaults are not applied to builder options, so the documented default of
      // 'false' has to be provided here. Without it the globber follows symbolic links.
      followSymbolicLinks: entry.followSymlinks ?? false,
    });

    const directoryExists = new Set<string>();

    for (const file of files) {
      const src = path.join(cwd, file);
      if (changed && !changed.has(src)) {
        continue;
      }

      // Only the input is checked by `normalizeAssetPatterns`, and a match can leave the
      // workspace root without it. A pattern that walks back out, such as '../../outside/*',
      // is joined to the input, and a pattern with a static directory prefix, such as
      // 'docs/**/*', makes the globber start from that directory, which is read through even
      // when it is a link and links are not followed. Every match is therefore resolved and
      // checked.
      const realSrc = resolveRealPath(src);
      if (
        realSrc !== undefined &&
        !isWithinDirectory(realRoot, realSrc) &&
        !(dependencyRoot !== undefined && isWithinDirectory(dependencyRoot, realSrc))
      ) {
        throw new Error(
          `The ${entry.input} asset path must be within the workspace root. ` +
            `'${file}' resolves to '${realSrc}', which is outside of it.`,
        );
      }

      const filePath = entry.flatten ? path.basename(file) : file;

      outputFiles.push({ source: src, destination: path.join(entry.output, filePath) });

      for (const base of basePaths) {
        const dest = path.join(base, entry.output, filePath);
        const dir = path.dirname(dest);
        if (!directoryExists.has(dir)) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          directoryExists.add(dir);
        }
        fs.copyFileSync(src, dest, fs.constants.COPYFILE_FICLONE);
      }
    }
  }

  return outputFiles;
}
