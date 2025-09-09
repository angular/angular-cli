/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join, relative } from 'node:path';

const bazelBinDirectory = process.env['BAZEL_BINDIR'];
const bazelExecRoot = process.env['JS_BINARY__EXECROOT'];

export function rewriteForBazel(path: string): string {
  if (!bazelBinDirectory || !bazelExecRoot) {
    return path;
  }

  const fromExecRoot = relative(bazelExecRoot, path);
  if (!fromExecRoot.startsWith('..')) {
    return path;
  }

  const fromBinDirectory = relative(bazelBinDirectory, path);
  if (fromBinDirectory.startsWith('..')) {
    return path;
  }

  return join(bazelExecRoot, fromBinDirectory);
}
