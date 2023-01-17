/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import {
  BuildContext,
  BuildFailure,
  BuildOptions,
  Message,
  Metafile,
  OutputFile,
  PartialMessage,
  build,
  context,
  formatMessages,
} from 'esbuild';
import { basename, extname, relative } from 'node:path';
import { FileInfo } from '../../utils/index-file/augment-index-html';

/**
 * Determines if an unknown value is an esbuild BuildFailure error object thrown by esbuild.
 * @param value A potential esbuild BuildFailure error object.
 * @returns `true` if the object is determined to be a BuildFailure object; otherwise, `false`.
 */
export function isEsBuildFailure(value: unknown): value is BuildFailure {
  return !!value && typeof value === 'object' && 'errors' in value && 'warnings' in value;
}

export class BundlerContext {
  #esbuildContext?: BuildContext<{ metafile: true; write: false }>;
  #esbuildOptions: BuildOptions & { metafile: true; write: false };

  constructor(private workspaceRoot: string, private incremental: boolean, options: BuildOptions) {
    this.#esbuildOptions = {
      ...options,
      metafile: true,
      write: false,
    };
  }

  /**
   * Executes the esbuild build function and normalizes the build result in the event of a
   * build failure that results in no output being generated.
   * All builds use the `write` option with a value of `false` to allow for the output files
   * build result array to be populated.
   *
   * @returns If output files are generated, the full esbuild BuildResult; if not, the
   * warnings and errors for the attempted build.
   */
  async bundle(): Promise<
    | { errors: Message[]; warnings: Message[] }
    | {
        errors: undefined;
        warnings: Message[];
        metafile: Metafile;
        outputFiles: OutputFile[];
        initialFiles: FileInfo[];
      }
  > {
    let result;
    try {
      if (this.#esbuildContext) {
        // Rebuild using the existing incremental build context
        result = await this.#esbuildContext.rebuild();
      } else if (this.incremental) {
        // Create an incremental build context and perform the first build.
        // Context creation does not perform a build.
        this.#esbuildContext = await context(this.#esbuildOptions);
        result = await this.#esbuildContext.rebuild();
      } else {
        // For non-incremental builds, perform a single build
        result = await build(this.#esbuildOptions);
      }
    } catch (failure) {
      // Build failures will throw an exception which contains errors/warnings
      if (isEsBuildFailure(failure)) {
        return failure;
      } else {
        throw failure;
      }
    }

    // Return if the build encountered any errors
    if (result.errors.length) {
      return {
        errors: result.errors,
        warnings: result.warnings,
      };
    }

    // Find all initial files
    const initialFiles: FileInfo[] = [];
    for (const outputFile of result.outputFiles) {
      // Entries in the metafile are relative to the `absWorkingDir` option which is set to the workspaceRoot
      const relativeFilePath = relative(this.workspaceRoot, outputFile.path);
      const entryPoint = result.metafile?.outputs[relativeFilePath]?.entryPoint;

      outputFile.path = relativeFilePath;

      if (entryPoint) {
        // An entryPoint value indicates an initial file
        initialFiles.push({
          file: outputFile.path,
          // The first part of the filename is the name of file (e.g., "polyfills" for "polyfills.7S5G3MDY.js")
          name: basename(outputFile.path).split('.')[0],
          extension: extname(outputFile.path),
        });
      }
    }

    // Return the successful build results
    return { ...result, initialFiles, errors: undefined };
  }

  /**
   * Disposes incremental build resources present in the context.
   *
   * @returns A promise that resolves when disposal is complete.
   */
  async dispose(): Promise<void> {
    try {
      return this.#esbuildContext?.dispose();
    } finally {
      this.#esbuildContext = undefined;
    }
  }
}

export async function logMessages(
  context: BuilderContext,
  { errors, warnings }: { errors?: PartialMessage[]; warnings?: PartialMessage[] },
): Promise<void> {
  if (warnings?.length) {
    const warningMessages = await formatMessages(warnings, { kind: 'warning', color: true });
    context.logger.warn(warningMessages.join('\n'));
  }

  if (errors?.length) {
    const errorMessages = await formatMessages(errors, { kind: 'error', color: true });
    context.logger.error(errorMessages.join('\n'));
  }
}
