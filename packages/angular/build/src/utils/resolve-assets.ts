/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { glob } from 'tinyglobby';

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

  for (const entry of entries) {
    const cwd = path.resolve(root, entry.input);
    const files = await glob(entry.glob, {
      cwd,
      dot: true,
      ignore: entry.ignore ? defaultIgnore.concat(entry.ignore) : defaultIgnore,
      followSymbolicLinks: entry.followSymlinks,
    });

    for (const file of files) {
      const src = path.join(cwd, file);
      const filePath = entry.flatten ? path.basename(file) : file;

      outputFiles.push({ source: src, destination: path.join(entry.output, filePath) });
    }
  }

  return outputFiles;
}
