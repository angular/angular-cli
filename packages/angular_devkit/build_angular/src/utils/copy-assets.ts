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
      ignore: entry.ignore ? defaultIgnore.concat(entry.ignore) : defaultIgnore,
    });

    for (const file of files) {
      const src = path.join(cwd, file);
      if (changed && !changed.has(src)) {
        continue;
      }

      const filePath = entry.flatten ? path.basename(file) : file;
      for (const base of basePaths) {
        const dest = path.join(base, entry.output, filePath);
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) {
          // tslint:disable-next-line: no-any
          fs.mkdirSync(dir, { recursive: true } as any);
        }
        copyFile(src, dest);
      }
    }
  }
}
