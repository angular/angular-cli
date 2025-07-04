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

import { join } from 'node:path';
import type { Plugin, PluginBuild, ResolveOptions, ResolveResult } from 'esbuild';

export interface CreateBazelSandboxPluginOptions {
  bindir: string;
  execroot: string;
}

// Under Bazel, esbuild will follow symlinks out of the sandbox when the sandbox is enabled. See https://github.com/aspect-build/rules_esbuild/issues/58.
// This plugin using a separate resolver to detect if the the resolution has left the execroot (which is the root of the sandbox
// when sandboxing is enabled) and patches the resolution back into the sandbox.
export function createBazelSandboxPlugin({
  bindir,
  execroot,
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

        return await resolveInExecroot({ build, bindir, execroot, importPath, otherOptions });
      });
    },
  };
}

interface ResolveInExecrootOptions {
  build: PluginBuild;
  bindir: string;
  execroot: string;
  importPath: string;
  otherOptions: ResolveOptions;
}

async function resolveInExecroot({
  build,
  bindir,
  execroot,
  importPath,
  otherOptions,
}: ResolveInExecrootOptions): Promise<ResolveResult> {
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
    // Not a relative or absolute path. Likely a module resolution that is marked "external"
    return result;
  }

  // If esbuild attempts to leave the execroot, map the path back into the execroot.
  if (!result.path.startsWith(execroot)) {
    // If it tried to leave bazel-bin, error out completely.
    if (!result.path.includes(bindir)) {
      throw new Error(
        `Error: esbuild resolved a path outside of BAZEL_BINDIR (${bindir}): ${result.path}`,
      );
    }
    // Otherwise remap the bindir-relative path
    const correctedPath = join(execroot, result.path.substring(result.path.indexOf(bindir)));
    if (!!process.env.JS_BINARY__LOG_DEBUG) {
      console.error(
        `DEBUG: [bazel-sandbox] correcting esbuild resolution ${result.path} that left the sandbox to ${correctedPath}.`,
      );
    }
    result.path = correctedPath;
  }

  return result;
}
