/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  BuildContext,
  BuildFailure,
  BuildOptions,
  Message,
  Metafile,
  OutputFile,
  build,
  context,
} from 'esbuild';
import { basename, extname, join, relative } from 'node:path';

export type BundleContextResult =
  | { errors: Message[]; warnings: Message[] }
  | {
      errors: undefined;
      warnings: Message[];
      metafile: Metafile;
      outputFiles: OutputFile[];
      initialFiles: Map<string, InitialFileRecord>;
    };

export interface InitialFileRecord {
  entrypoint: boolean;
  name?: string;
  type: 'script' | 'style';
  external?: boolean;
}

/**
 * Determines if an unknown value is an esbuild BuildFailure error object thrown by esbuild.
 * @param value A potential esbuild BuildFailure error object.
 * @returns `true` if the object is determined to be a BuildFailure object; otherwise, `false`.
 */
function isEsBuildFailure(value: unknown): value is BuildFailure {
  return !!value && typeof value === 'object' && 'errors' in value && 'warnings' in value;
}

export class BundlerContext {
  #esbuildContext?: BuildContext<{ metafile: true; write: false }>;
  #esbuildOptions: BuildOptions & { metafile: true; write: false };

  readonly watchFiles = new Set<string>();

  constructor(
    private workspaceRoot: string,
    private incremental: boolean,
    options: BuildOptions,
    private initialFilter?: (initial: Readonly<InitialFileRecord>) => boolean,
  ) {
    this.#esbuildOptions = {
      ...options,
      metafile: true,
      write: false,
    };
  }

  static async bundleAll(contexts: Iterable<BundlerContext>): Promise<BundleContextResult> {
    const individualResults = await Promise.all([...contexts].map((context) => context.bundle()));

    // Return directly if only one result
    if (individualResults.length === 1) {
      return individualResults[0];
    }

    let errors: Message[] | undefined;
    const warnings: Message[] = [];
    const metafile: Metafile = { inputs: {}, outputs: {} };
    const initialFiles = new Map<string, InitialFileRecord>();
    const outputFiles = [];
    for (const result of individualResults) {
      warnings.push(...result.warnings);
      if (result.errors) {
        errors ??= [];
        errors.push(...result.errors);
        continue;
      }

      // Combine metafiles used for the stats option as well as bundle budgets and console output
      if (result.metafile) {
        metafile.inputs = { ...metafile.inputs, ...result.metafile.inputs };
        metafile.outputs = { ...metafile.outputs, ...result.metafile.outputs };
      }

      result.initialFiles.forEach((value, key) => initialFiles.set(key, value));
      outputFiles.push(...result.outputFiles);
    }

    if (errors !== undefined) {
      return { errors, warnings };
    }

    return {
      errors,
      warnings,
      metafile,
      initialFiles,
      outputFiles,
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
  async bundle(): Promise<BundleContextResult> {
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

    // Update files that should be watched.
    // While this should technically not be linked to incremental mode, incremental is only
    // currently enabled with watch mode where watch files are needed.
    if (this.incremental) {
      this.watchFiles.clear();
      // Add input files except virtual angular files which do not exist on disk
      Object.keys(result.metafile.inputs)
        .filter((input) => !input.startsWith('angular:'))
        .forEach((input) => this.watchFiles.add(join(this.workspaceRoot, input)));
    }

    // Return if the build encountered any errors
    if (result.errors.length) {
      return {
        errors: result.errors,
        warnings: result.warnings,
      };
    }

    // Find all initial files
    const initialFiles = new Map<string, InitialFileRecord>();
    for (const outputFile of result.outputFiles) {
      // Entries in the metafile are relative to the `absWorkingDir` option which is set to the workspaceRoot
      const relativeFilePath = relative(this.workspaceRoot, outputFile.path);
      const entryPoint = result.metafile.outputs[relativeFilePath]?.entryPoint;

      outputFile.path = relativeFilePath;

      if (entryPoint) {
        // The first part of the filename is the name of file (e.g., "polyfills" for "polyfills.7S5G3MDY.js")
        const name = basename(relativeFilePath).split('.', 1)[0];
        // Entry points are only styles or scripts
        const type = extname(relativeFilePath) === '.css' ? 'style' : 'script';

        // Only entrypoints with an entry in the options are initial files.
        // Dynamic imports also have an entryPoint value in the meta file.
        if ((this.#esbuildOptions.entryPoints as Record<string, string>)?.[name]) {
          // An entryPoint value indicates an initial file
          const record: InitialFileRecord = {
            name,
            type,
            entrypoint: true,
          };

          if (!this.initialFilter || this.initialFilter(record)) {
            initialFiles.set(relativeFilePath, record);
          }
        }
      }
    }

    // Analyze for transitive initial files
    const files = [...initialFiles.keys()];
    for (const file of files) {
      for (const initialImport of result.metafile.outputs[file].imports) {
        if (initialFiles.has(initialImport.path)) {
          continue;
        }

        if (initialImport.kind === 'import-statement' || initialImport.kind === 'import-rule') {
          const record: InitialFileRecord = {
            type: initialImport.kind === 'import-rule' ? 'style' : 'script',
            entrypoint: false,
            external: initialImport.external,
          };

          if (!this.initialFilter || this.initialFilter(record)) {
            initialFiles.set(initialImport.path, record);
          }

          if (!initialImport.external) {
            files.push(initialImport.path);
          }
        }
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
