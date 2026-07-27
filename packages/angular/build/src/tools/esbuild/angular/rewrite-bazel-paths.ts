/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { join, relative, sep } from 'node:path';

const bazelBinDirectory = process.env['BAZEL_BINDIR'];
const bazelExecRoot = process.env['JS_BINARY__EXECROOT'];
const execRootMarker = `${sep}execroot${sep}`;

/**
 * Sandboxed actions run in a copy of the execroot whose absolute path differs from
 * `JS_BINARY__EXECROOT`, so the effective execroot is derived from the working directory.
 */
function effectiveExecRoot(): string | undefined {
  const cwd = process.cwd();
  const markerIndex = cwd.indexOf(execRootMarker);
  if (markerIndex === -1) {
    return bazelExecRoot;
  }

  const workspaceEnd = cwd.indexOf(sep, markerIndex + execRootMarker.length);

  return workspaceEnd === -1 ? cwd : cwd.slice(0, workspaceEnd);
}

export function rewriteForBazel(path: string): string {
  if (!bazelBinDirectory || !bazelExecRoot) {
    return path;
  }

  const execRoot = effectiveExecRoot() ?? bazelExecRoot;

  const fromExecRoot = relative(execRoot, path);
  if (!fromExecRoot.startsWith('..')) {
    return path;
  }

  const fromBinDirectory = relative(bazelBinDirectory, path);
  if (!fromBinDirectory.startsWith('..')) {
    return join(execRoot, fromBinDirectory);
  }

  // A path that realpath resolved out of a symlink-staged sandbox into the
  // unsandboxed execroot: re-anchor its execroot-relative tail.
  const markerIndex = path.indexOf(execRootMarker);
  if (markerIndex !== -1) {
    const tail = path.slice(markerIndex + execRootMarker.length);
    const workspaceEnd = tail.indexOf(sep);
    if (workspaceEnd !== -1) {
      return join(execRoot, tail.slice(workspaceEnd + 1));
    }
  }

  return path;
}
