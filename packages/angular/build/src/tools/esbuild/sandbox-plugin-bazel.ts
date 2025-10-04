/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Forked from https://github.com/aspect-build/rules_esbuild/blob/e4e49d3354cbf7087c47ac9c5f2e6fe7f5e398d3/esbuild/private/plugins/bazel-sandbox.js
 */

import type { OnResolveResult, Plugin, PluginBuild, ResolveOptions } from 'esbuild';
import { stat } from 'node:fs/promises';
import path, { join } from 'node:path';

export interface CreateBazelSandboxPluginOptions {
  bindir: string;
  execroot: string;
  runfiles?: string;
}

// Under Bazel, esbuild will follow symlinks out of the sandbox when the sandbox
// is enabled. See https://github.com/aspect-build/rules_esbuild/issues/58. This
// plugin using a separate resolver to detect if the the resolution has left the
// execroot (which is the root of the sandbox when sandboxing is enabled) and
// patches the resolution back into the sandbox.
export function createBazelSandboxPlugin({
  bindir,
  execroot,
  runfiles,
}: CreateBazelSandboxPluginOptions): Plugin {
  return {
    name: 'bazel-sandbox',
    setup(build) {
      build.onResolve({ filter: /./ }, async ({ path: importPath, ...otherOptions }) => {
        // NB: these lines are to prevent infinite recursion when we call `build.resolve`.
        if (otherOptions.pluginData) {
          if (otherOptions.pluginData.executedSandboxPlugin) {
            return;
          }
        } else {
          otherOptions.pluginData = {};
        }
        otherOptions.pluginData.executedSandboxPlugin = true;

        return await resolveInExecroot({
          build,
          bindir,
          execroot,
          runfiles,
          importPath,
          otherOptions,
        });
      });
    },
  };
}

interface ResolveInExecrootOptions {
  build: PluginBuild;
  bindir: string;
  execroot: string;
  runfiles?: string;
  importPath: string;
  otherOptions: ResolveOptions;
}

const EXTERNAL_PREFIX = 'external/';
const NON_EXTERNAL_PREFIX = '_main/';

function runfilesRelativePath(filePath: string): string {
  // Normalize to relative path without leading slash.
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1);
  }
  // Remove the EXTERNAL_PREFIX if present.
  if (filePath.startsWith(EXTERNAL_PREFIX)) {
    filePath = filePath.substring(EXTERNAL_PREFIX.length);
  } else if (!filePath.startsWith(NON_EXTERNAL_PREFIX)) {
    // If the file is not in an external repository, the file will be under
    // `_main` within the runfiles tree.
    filePath = NON_EXTERNAL_PREFIX + filePath;
  }

  return filePath;
}

async function resolveInExecroot({
  build,
  bindir,
  execroot,
  runfiles,
  importPath,
  otherOptions,
}: ResolveInExecrootOptions): Promise<OnResolveResult> {
  const result = await build.resolve(importPath, otherOptions);

  if (result.errors && result.errors.length) {
    // There was an error resolving, just return the error as-is.
    return result;
  }

  if (
    !result.path.startsWith('.') &&
    !result.path.startsWith('/') &&
    !result.path.startsWith('\\')
  ) {
    // Not a relative or absolute path. Likely a module resolution that is
    // marked "external"
    return result;
  }

  // If esbuild attempts to leave the execroot, map the path back into the
  // execroot.
  if (!result.path.startsWith(execroot)) {
    // If it tried to leave bazel-bin, error out completely.
    if (!result.path.includes(bindir)) {
      throw new Error(
        `Error: esbuild resolved a path outside of BAZEL_BINDIR (${bindir}): ${result.path}`,
      );
    }
    // Get the path under the bindir for the file. This allows us to map into
    // the execroot or the runfiles directory (if present).
    // Example:
    //   bindir             = bazel-out/<arch>/bin
    //   result.path        = <base>/execroot/bazel-out/<arch>/bin/external/repo+/path/file.ts
    //   binDirRelativePath = external/repo+/path/file.ts
    const binDirRelativePath = result.path.substring(
      result.path.indexOf(bindir) + bindir.length + 1,
    );
    // We usually remap into the bindir. However, when sources are provided
    // as `data` (runfiles), they will be in the runfiles root instead. The
    // runfiles path is absolute and under the bindir, so we don't need to
    // join anything to it. The execroot does not include the bindir, so there
    // we add it again after previously removing it from the result path.
    const remapBase = runfiles ?? path.join(execroot, bindir);
    // The path relative to the remapBase also differs between runfiles and
    // bindir. External repositories appear under `external/repo+` in the
    // bindir, whereas they are directly under `repo+` in the runfiles tree.
    // Non-external files appear under a special `_main` directory in the
    // runfiles tree, but not in the bindir. These differences need to be
    // accounted for by removing a potential `external/` prefix or adding a
    // `_main` prefix when mapping into runfiles.
    const remapBaseRelativePath = runfiles
      ? runfilesRelativePath(binDirRelativePath)
      : binDirRelativePath;
    // Join the paths back together. The results will look slightly different
    // between runfiles and bindir, but this is intentional.
    // Source path:
    //   <bin>/external/repo+/path/file.ts
    // Example in bindir:
    //   <sandbox-bin>/external/repo+/path/file.ts
    // Example in runfiles:
    //   <sandbox-bin>/path/bin.runfiles/repo+/path/file.ts
    const correctedPath = join(remapBase, remapBaseRelativePath);
    if (process.env.JS_BINARY__LOG_DEBUG) {
      // eslint-disable-next-line no-console
      console.error(
        `DEBUG: [bazel-sandbox] correcting resolution ${result.path} that left the sandbox to ${correctedPath}.`,
      );
    }
    result.path = correctedPath;

    // Fall back to `.js` file if resolved `.ts` file does not exist in the
    // changed path.
    //
    // It's possible that a `.ts` file exists outside the sandbox and esbuild
    // resolves it. It is not guaranteed that the sandbox also contains the same
    // file. One example might be that the build depends on a compiled version
    // of the file and the sandbox will only contain the corresponding `.js` and
    // `.d.ts` files.
    if (result.path.endsWith('.ts')) {
      try {
        await stat(result.path);
      } catch (e: unknown) {
        const jsPath = result.path.slice(0, -3) + '.js';
        if (process.env.JS_BINARY__LOG_DEBUG) {
          // eslint-disable-next-line no-console
          console.error(
            `DEBUG: [bazel-sandbox] corrected resolution ${result.path} does not exist in the sandbox, trying ${jsPath}.`,
          );
        }
        result.path = jsPath;
      }
    }
  }

  return result;
}
