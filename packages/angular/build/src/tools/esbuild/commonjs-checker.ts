/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
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
 * diagnostic will be generated. Use `'*'` as entry to skip the check.
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

  if (allowedRequests.has('*')) {
    return messages;
  }

  // Ignore Angular locale definitions which are currently UMD
  allowedRequests.add('@angular/common/locales');

  // Ignore zone.js due to it currently being built with a UMD like structure.
  // Once the build output is updated to be fully ESM, this can be removed.
  allowedRequests.add('zone.js');

  // Used by '@angular/platform-server' and is in a seperate chunk that is unused when
  // using `provideHttpClient(withFetch())`.
  allowedRequests.add('xhr2');

  // Packages used by @angular/ssr.
  // While beasties is ESM it has a number of direct and transtive CJS deps.
  allowedRequests.add('express');
  allowedRequests.add('beasties');

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

      // If the dependency is allowed ignore all other checks
      if (allowedRequests.has(imported.original)) {
        continue;
      }

      // Only check actual code files
      if (!isPathCode(imported.path)) {
        continue;
      }

      // Check if non-relative import is ESM format and issue a diagnostic if the file is not allowed
      if (
        !isPotentialRelative(imported.original) &&
        metafile.inputs[imported.path].format !== 'esm'
      ) {
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
          // Issue a diagnostic message for CommonJS module
          messages.push(createCommonJSModuleError(request, currentFile));
        }

        // Skip all descendants since they are also most likely not ESM but solved by addressing this import
        continue;
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
 * Test an import module specifier to determine if the string potentially references a relative file.
 * npm packages should not start with a period so if the first character is a period than it is not a
 * package. While this is sufficient for the use case in the CommmonJS checker, only checking the
 * first character does not definitely indicate the specifier is a relative path.
 *
 * @param specifier An import module specifier.
 * @returns True, if specifier is potentially relative; false, otherwise.
 */
function isPotentialRelative(specifier: string): boolean {
  return specifier[0] === '.';
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
          'For more information see: https://angular.dev/tools/cli/build#configuring-commonjs-dependencies',
      },
    ],
  };

  return error;
}
