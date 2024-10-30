/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  BuildOutputFile,
  BuildOutputFileType,
  BundleContextResult,
  BundlerContext,
} from '../bundler-context';
import { MemoryCache } from '../cache';
import {
  BundleStylesheetOptions,
  createStylesheetBundleOptions,
} from '../stylesheets/bundle-options';

export type ComponentStylesheetResult = BundleContextResult & {
  contents: string;
  referencedFiles: Set<string> | undefined;
};

/**
 * Bundles component stylesheets. A stylesheet can be either an inline stylesheet that
 * is contained within the Component's metadata definition or an external file referenced
 * from the Component's metadata definition.
 */
export class ComponentStylesheetBundler {
  readonly #fileContexts = new MemoryCache<BundlerContext>();
  readonly #inlineContexts = new MemoryCache<BundlerContext>();

  /**
   *
   * @param options An object containing the stylesheet bundling options.
   * @param cache A load result cache to use when bundling.
   */
  constructor(
    private readonly options: BundleStylesheetOptions,
    private readonly defaultInlineLanguage: string,
    private readonly incremental: boolean,
  ) {}

  /**
   * Bundle a file-based component stylesheet for use within an AOT compiled Angular application.
   * @param entry The file path of the stylesheet.
   * @param externalId Either an external identifier string for initial bundling or a boolean for rebuilds, if external.
   * @param direct If true, the output will be used directly by the builder; false if used inside the compiler plugin.
   * @returns A component bundle result object.
   */
  async bundleFile(
    entry: string,
    externalId?: string | boolean,
    direct?: boolean,
  ): Promise<ComponentStylesheetResult> {
    const bundlerContext = await this.#fileContexts.getOrCreate(entry, () => {
      return new BundlerContext(this.options.workspaceRoot, this.incremental, (loadCache) => {
        const buildOptions = createStylesheetBundleOptions(this.options, loadCache);
        if (externalId) {
          assert(
            typeof externalId === 'string',
            'Initial external component stylesheets must have a string identifier',
          );

          buildOptions.entryPoints = { [externalId]: entry };
          buildOptions.entryNames = '[name]';
          delete buildOptions.publicPath;
        } else {
          buildOptions.entryPoints = [entry];
        }

        return buildOptions;
      });
    });

    return this.extractResult(
      await bundlerContext.bundle(),
      bundlerContext.watchFiles,
      !!externalId,
      !!direct,
    );
  }

  async bundleInline(
    data: string,
    filename: string,
    language = this.defaultInlineLanguage,
    externalId?: string,
  ): Promise<ComponentStylesheetResult> {
    // Use a hash of the inline stylesheet content to ensure a consistent identifier. External stylesheets will resolve
    // to the actual stylesheet file path.
    // TODO: Consider xxhash instead for hashing
    const id = createHash('sha256')
      .update(data)
      .update(externalId ?? '')
      .digest('hex');
    const entry = [language, id, filename].join(';');

    const bundlerContext = await this.#inlineContexts.getOrCreate(entry, () => {
      const namespace = 'angular:styles/component';

      return new BundlerContext(this.options.workspaceRoot, this.incremental, (loadCache) => {
        const buildOptions = createStylesheetBundleOptions(this.options, loadCache, {
          [entry]: data,
        });
        if (externalId) {
          buildOptions.entryPoints = { [externalId]: `${namespace};${entry}` };
          buildOptions.entryNames = '[name]';
          delete buildOptions.publicPath;
        } else {
          buildOptions.entryPoints = [`${namespace};${entry}`];
        }

        buildOptions.plugins.push({
          name: 'angular-component-styles',
          setup(build) {
            build.onResolve({ filter: /^angular:styles\/component;/ }, (args) => {
              if (args.kind !== 'entry-point') {
                return null;
              }

              return {
                path: entry,
                namespace,
              };
            });
            build.onLoad({ filter: /^css;/, namespace }, () => {
              return {
                contents: data,
                loader: 'css',
                resolveDir: path.dirname(filename),
              };
            });
          },
        });

        return buildOptions;
      });
    });

    // Extract the result of the bundling from the output files
    return this.extractResult(
      await bundlerContext.bundle(),
      bundlerContext.watchFiles,
      !!externalId,
      false,
    );
  }

  /**
   * Invalidates both file and inline based component style bundling state for a set of modified files.
   * @param files The group of files that have been modified
   * @returns An array of file based stylesheet entries if any were invalidated; otherwise, undefined.
   */
  invalidate(files: Iterable<string>): string[] | undefined {
    if (!this.incremental) {
      return;
    }

    const normalizedFiles = [...files].map(path.normalize);
    let entries: string[] | undefined;

    for (const [entry, bundler] of this.#fileContexts.entries()) {
      if (bundler.invalidate(normalizedFiles)) {
        entries ??= [];
        entries.push(entry);
      }
    }
    for (const bundler of this.#inlineContexts.values()) {
      bundler.invalidate(normalizedFiles);
    }

    return entries;
  }

  collectReferencedFiles(): string[] {
    const files = [];
    for (const context of this.#fileContexts.values()) {
      files.push(...context.watchFiles);
    }

    return files;
  }

  async dispose(): Promise<void> {
    const contexts = [...this.#fileContexts.values(), ...this.#inlineContexts.values()];
    this.#fileContexts.clear();
    this.#inlineContexts.clear();

    await Promise.allSettled(contexts.map((context) => context.dispose()));
  }

  private extractResult(
    result: BundleContextResult,
    referencedFiles: Set<string> | undefined,
    external: boolean,
    direct: boolean,
  ): ComponentStylesheetResult {
    let contents = '';
    const outputFiles: BuildOutputFile[] = [];

    const { errors, warnings } = result;
    if (errors) {
      return { errors, warnings, referencedFiles, contents: '' };
    }

    for (const outputFile of result.outputFiles) {
      const filename = path.basename(outputFile.path);

      if (outputFile.type === BuildOutputFileType.Media || filename.endsWith('.css.map')) {
        // The output files could also contain resources (images/fonts/etc.) that were referenced and the map files.

        // Clone the output file to avoid amending the original path which would causes problems during rebuild.
        const clonedOutputFile = outputFile.clone();

        // Needed for Bazel as otherwise the files will not be written in the correct place,
        // this is because esbuild will resolve the output file from the outdir which is currently set to `workspaceRoot` twice,
        // once in the stylesheet and the other in the application code bundler.
        // Ex: `../../../../../app.component.css.map`.
        if (!direct) {
          clonedOutputFile.path = path.join(this.options.workspaceRoot, outputFile.path);
        }

        outputFiles.push(clonedOutputFile);
      } else if (filename.endsWith('.css')) {
        if (external) {
          const clonedOutputFile = outputFile.clone();
          if (!direct) {
            clonedOutputFile.path = path.join(this.options.workspaceRoot, outputFile.path);
          }
          outputFiles.push(clonedOutputFile);
          contents = path.posix.join(this.options.publicPath ?? '', filename);
        } else {
          contents = outputFile.text;
        }
      } else {
        throw new Error(
          `Unexpected non CSS/Media file "${filename}" outputted during component stylesheet processing.`,
        );
      }
    }

    const metafile = result.metafile;
    // Remove entryPoint fields from outputs to prevent the internal component styles from being
    // treated as initial files. Also mark the entry as a component resource for stat reporting.
    Object.values(metafile.outputs).forEach((output) => {
      delete output.entryPoint;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (output as any)['ng-component'] = true;
    });

    return {
      errors,
      warnings,
      contents,
      outputFiles,
      metafile,
      referencedFiles,
      externalImports: result.externalImports,
      initialFiles: new Map(),
    };
  }
}
