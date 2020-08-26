/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { copyFile } from './copy-file';

function globAsync(pattern: string, options: glob.IOptions) {
  return new Promise<string[]>((resolve, reject) =>
    glob(pattern, options, (e, m) => (e ? reject(e) : resolve(m))),
  );
}

export async function copyAssets(
  entries: { glob: string; ignore?: string[]; input: string; output: string; flatten?: boolean }[],
  basePaths: Iterable<string>,
  root: string,
  changed?: Set<string>,
) {
  const defaultIgnore = ['.gitkeep', '**/.DS_Store', '**/Thumbs.db'];

  for (const entry of entries) {
    const cwd = path.resolve(root, entry.input);
    const files = await globAsync(entry.glob, {
      cwd,
      dot: true,
      nodir: true,
      ignore: entry.ignore ? defaultIgnore.concat(entry.ignore) : defaultIgnore,
    });

    const directoryExists = new Set<string>();

    for (const file of files) {
      const src = path.join(cwd, file);
      if (changed && !changed.has(src)) {
        continue;
      }

      const filePath = entry.flatten ? path.basename(file) : file;
      for (const base of basePaths) {
        const dest = path.join(base, entry.output, filePath);
        const dir = path.dirname(dest);
        if (!directoryExists.has(dir)) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          directoryExists.add(dir);
        }
        copyFile(src, dest);
      }
    }
  }
}
