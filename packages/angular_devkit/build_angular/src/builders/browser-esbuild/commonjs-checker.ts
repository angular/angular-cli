/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Metafile, PartialMessage } from 'esbuild';

/**
 * Checks the input files of a build to determine if any of the files included
 * in the build are not ESM. ESM files can be tree-shaken and otherwise optimized
 * in ways that CommonJS and other module formats cannot. The esbuild metafile
 * information is used as the basis for the analysis as it contains information
 * for each input file including its respective format.
 *
 * If any allowed dependencies are provided via the `allowedCommonJsDependencies`
 * parameter, both the direct import and any deep imports will be ignored and no
 * diagnostic will be generated.
 *
 * If a module has been issued a diagnostic message, then all descendant modules
 * will not be checked. This prevents a potential massive amount of inactionable
 * messages since the initial module import is the cause of the problem.
 *
 * @param metafile An esbuild metafile object to check.
 * @param allowedCommonJsDependencies An optional list of allowed dependencies.
 * @returns Zero or more diagnostic messages for any non-ESM modules.
 */
export function checkCommonJSModules(
  metafile: Metafile,
  allowedCommonJsDependencies?: string[],
): PartialMessage[] {
  const messages: PartialMessage[] = [];
  const allowedRequests = new Set(allowedCommonJsDependencies);

  // Ignore Angular locale definitions which are currently UMD
  allowedRequests.add('@angular/common/locales');

  // Find all entry points that contain code (JS/TS)
  const files: string[] = [];
  for (const { entryPoint } of Object.values(metafile.outputs)) {
    if (!entryPoint) {
      continue;
    }
    if (!isPathCode(entryPoint)) {
      continue;
    }

    files.push(entryPoint);
  }

  // Track seen files so they are only analyzed once.
  // Bundler runtime code is also ignored since it cannot be actionable.
  const seenFiles = new Set<string>(['<runtime>']);

  // Analyze the files present by walking the import graph
  let currentFile: string | undefined;
  while ((currentFile = files.shift())) {
    const input = metafile.inputs[currentFile];

    for (const imported of input.imports) {
      // Ignore imports that were already seen or not originally in the code (bundler injected)
      if (!imported.original || seenFiles.has(imported.path)) {
        continue;
      }
      seenFiles.add(imported.path);

      // Only check actual code files
      if (!isPathCode(imported.path)) {
        continue;
      }

      // Check if the import is ESM format and issue a diagnostic if the file is not allowed
      if (metafile.inputs[imported.path].format !== 'esm') {
        const request = imported.original;

        let notAllowed = true;
        if (allowedRequests.has(request)) {
          notAllowed = false;
        } else {
          // Check for deep imports of allowed requests
          for (const allowed of allowedRequests) {
            if (request.startsWith(allowed + '/')) {
              notAllowed = false;
              break;
            }
          }
        }

        if (notAllowed) {
          // Issue a diagnostic message and skip all descendants since they are also most
          // likely not ESM but solved by addressing this import.
          messages.push(createCommonJSModuleError(request, currentFile));
          continue;
        }
      }

      // Add the path so that its imports can be checked
      files.push(imported.path);
    }
  }

  return messages;
}

/**
 * Determines if a file path has an extension that is a JavaScript or TypeScript
 * code file.
 *
 * @param name A path to check for code file extensions.
 * @returns True, if a code file path; false, otherwise.
 */
function isPathCode(name: string): boolean {
  return /\.[cm]?[jt]sx?$/.test(name);
}

/**
 * Creates an esbuild diagnostic message for a given non-ESM module request.
 *
 * @param request The requested non-ESM module name.
 * @param importer The path of the file containing the import.
 * @returns A message representing the diagnostic.
 */
function createCommonJSModuleError(request: string, importer: string): PartialMessage {
  const error = {
    text: `Module '${request}' used by '${importer}' is not ESM`,
    notes: [
      {
        text:
          'CommonJS or AMD dependencies can cause optimization bailouts.\n' +
          'For more information see: https://angular.io/guide/build#configuring-commonjs-dependencies',
      },
    ],
  };

  return error;
}
