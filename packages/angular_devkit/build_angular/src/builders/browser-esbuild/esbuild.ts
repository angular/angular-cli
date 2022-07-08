/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import {
  BuildFailure,
  BuildOptions,
  BuildResult,
  Message,
  OutputFile,
  build,
  formatMessages,
} from 'esbuild';

/**
 * Determines if an unknown value is an esbuild BuildFailure error object thrown by esbuild.
 * @param value A potential esbuild BuildFailure error object.
 * @returns `true` if the object is determined to be a BuildFailure object; otherwise, `false`.
 */
export function isEsBuildFailure(value: unknown): value is BuildFailure {
  return !!value && typeof value === 'object' && 'errors' in value && 'warnings' in value;
}

/**
 * Executes the esbuild build function and normalizes the build result in the event of a
 * build failure that results in no output being generated.
 * All builds use the `write` option with a value of `false` to allow for the output files
 * build result array to be populated.
 *
 * @param options The esbuild options object to use when building.
 * @returns If output files are generated, the full esbuild BuildResult; if not, the
 * warnings and errors for the attempted build.
 */
export async function bundle(
  options: BuildOptions,
): Promise<
  (BuildResult & { outputFiles: OutputFile[] }) | (BuildFailure & { outputFiles?: never })
> {
  try {
    return await build({
      ...options,
      write: false,
    });
  } catch (failure) {
    // Build failures will throw an exception which contains errors/warnings
    if (isEsBuildFailure(failure)) {
      return failure;
    } else {
      throw failure;
    }
  }
}

export async function logMessages(
  context: BuilderContext,
  { errors, warnings }: { errors: Message[]; warnings: Message[] },
): Promise<void> {
  if (warnings.length) {
    const warningMessages = await formatMessages(warnings, { kind: 'warning', color: true });
    context.logger.warn(warningMessages.join('\n'));
  }

  if (errors.length) {
    const errorMessages = await formatMessages(errors, { kind: 'error', color: true });
    context.logger.error(errorMessages.join('\n'));
  }
}
