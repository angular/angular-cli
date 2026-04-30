/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import {
  generateDebugId,
  injectDebugIdIntoJs,
  injectDebugIdIntoSourceMap,
} from '../../utils/debug-id';

/**
 * Embeds an ECMA-426 Debug ID into every browser JavaScript output that has a
 * matching source map sibling.
 *
 * The Debug ID is derived deterministically (UUIDv5) from the source map bytes
 * so rebuilds of the same source produce the same ID. The JS file gets a
 * `//# debugId=<uuid>` comment placed above any existing
 * `//# sourceMappingURL=` line and the source map JSON gets a top-level
 * `"debugId"` field. Together they make build artifacts self-identifying as
 * proposed by https://github.com/tc39/ecma426/blob/main/proposals/debug-id.md.
 */
export function injectDebugIds(outputFiles: BuildOutputFile[]): void {
  const filesByPath = new Map<string, BuildOutputFile>();
  for (const file of outputFiles) {
    filesByPath.set(file.path, file);
  }

  const encoder = new TextEncoder();

  for (const file of outputFiles) {
    if (file.type !== BuildOutputFileType.Browser || !file.path.endsWith('.js')) {
      continue;
    }

    const map = filesByPath.get(`${file.path}.map`);
    if (!map) {
      continue;
    }

    const id = generateDebugId(map.contents);
    file.contents = encoder.encode(injectDebugIdIntoJs(file.text, id));
    map.contents = encoder.encode(injectDebugIdIntoSourceMap(map.text, id));
  }
}
