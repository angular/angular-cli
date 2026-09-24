/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { glob } from 'tinyglobby';
import { isDependencyPath, isSubDirectory, resolveRealPath } from './path';

export async function resolveAssets(
  entries: {
    glob: string;
    ignore?: string[];
    input: string;
    output: string;
    flatten?: boolean;
    followSymlinks?: boolean;
  }[],
  root: string,
): Promise<{ source: string; destination: string }[]> {
  const defaultIgnore = ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'];

  const outputFiles: { source: string; destination: string }[] = [];
  const resolvedRoot = path.resolve(root);
  const realRoot = (await resolveRealPath(resolvedRoot)) ?? resolvedRoot;

  for (const entry of entries) {
    if (!isSubDirectory(root, entry.input)) {
      throw new Error(`The ${entry.input} asset path must be within the workspace root.`);
    }

    const cwd = path.resolve(root, entry.input);

    // The check above compares paths textually, while a symbolic link only resolves to its
    // target on disk. An input that appears to be inside the workspace root can therefore
    // still point outside of it. A path that cannot be resolved does not exist and has
    // nothing to read.
    const realCwd = await resolveRealPath(cwd);

    // An input that asks for a dependency is allowed to resolve out of the workspace root,
    // and what it resolves to becomes the boundary for its own matches instead.
    const dependencyRoot = isDependencyPath(entry.input) ? realCwd : undefined;

    if (
      dependencyRoot === undefined &&
      realCwd !== undefined &&
      !isSubDirectory(realRoot, realCwd)
    ) {
      throw new Error(
        `The ${entry.input} asset path must be within the workspace root. ` +
          `It resolves to '${realCwd}' through a symbolic link.`,
      );
    }

    const files = await glob(entry.glob, {
      cwd,
      dot: true,
      ignore: entry.ignore ? defaultIgnore.concat(entry.ignore) : defaultIgnore,
      // Schema defaults are not applied to builder options, so the documented default of
      // 'false' has to be provided here. Without it the globber follows symbolic links.
      followSymbolicLinks: entry.followSymlinks ?? false,
    });

    for (const file of files) {
      const src = path.join(cwd, file);

      // Only the input is checked above, and a match can leave the workspace root without
      // it. A pattern that walks back out, such as '../../outside/*', is joined to the
      // input, and a pattern with a static directory prefix, such as 'docs/**/*', makes the
      // globber start from that directory, which is read through even when it is a link and
      // links are not followed. Every match is therefore resolved and checked.
      const realSrc = await resolveRealPath(src);
      if (
        realSrc !== undefined &&
        !isSubDirectory(realRoot, realSrc) &&
        !(dependencyRoot !== undefined && isSubDirectory(dependencyRoot, realSrc))
      ) {
        throw new Error(
          `The ${entry.input} asset path must be within the workspace root. ` +
            `'${file}' resolves to '${realSrc}', which is outside of it.`,
        );
      }

      const filePath = entry.flatten ? path.basename(file) : file;

      outputFiles.push({ source: src, destination: path.join(entry.output, filePath) });
    }
  }

  return outputFiles;
}
