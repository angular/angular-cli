/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import path from 'node:path';
import { createContentHash } from '../../../utils/hash';
import { BundleContextResult, BundlerContext } from '../bundler-context';
import { type BuildOutputFile, BuildOutputFileType } from '../bundler-files';
import { MemoryCache } from '../cache';
import { MemoryLoadResultCache } from '../load-result-cache';
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
  readonly #loadCache = new MemoryLoadResultCache();

  /**
   * @param options An object containing the stylesheet bundling options.
   * @param defaultInlineLanguage The default language to use for inline component styles.
   * @param incremental True if incremental watch mode is enabled.
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
    entry = path.normalize(entry);

    const bundlerContext = await this.#fileContexts.getOrCreate(entry, () => {
      return new BundlerContext(
        this.options.workspaceRoot,
        this.incremental,
        (loadCache) => {
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

          // Angular encapsulation does not support nesting
          // See: https://github.com/angular/angular/issues/58996
          buildOptions.supported ??= {};
          buildOptions.supported['nesting'] = false;

          return buildOptions;
        },
        /* useContext */ false,
        /* initialFilter */ undefined,
        this.#loadCache,
      );
    });

    return this.extractResult(
      await bundlerContext.bundle(),
      bundlerContext.watchFiles,
      !!externalId,
      !!direct,
    );
  }

  bundleAllFiles(external: boolean, direct: boolean) {
    return Promise.all(
      Array.from(this.#fileContexts.entries()).map(([entry]) =>
        this.bundleFile(entry, external, direct),
      ),
    );
  }

  async bundleInline(
    data: string,
    filename: string,
    language = this.defaultInlineLanguage,
    externalId?: string,
  ): Promise<ComponentStylesheetResult> {
    filename = path.normalize(filename);

    // Use a hash of the inline stylesheet content to ensure a consistent identifier. External stylesheets will resolve
    // to the actual stylesheet file path.
    const hasher = createContentHash();
    hasher.update(data);
    hasher.update(externalId ?? '');
    const id = hasher.digest();
    const entry = [language, id, filename].join(';');

    const bundlerContext = await this.#inlineContexts.getOrCreate(entry, () => {
      const namespace = 'angular:styles/component';

      return new BundlerContext(
        this.options.workspaceRoot,
        this.incremental,
        (loadCache) => {
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

          // Angular encapsulation does not support nesting
          // See: https://github.com/angular/angular/issues/58996
          buildOptions.supported ??= {};
          buildOptions.supported['nesting'] = false;

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
        },
        /* useContext */ false,
        /* initialFilter */ undefined,
        this.#loadCache,
      );
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
  invalidate(files: Iterable<string> | ReadonlySet<string>): string[] | undefined {
    if (!this.incremental) {
      return;
    }

    const normalizedFiles = new Set<string>();
    for (const file of files) {
      const normalized = path.normalize(file);
      normalizedFiles.add(normalized);
      if (!path.isAbsolute(normalized)) {
        normalizedFiles.add(path.normalize(path.join(this.options.workspaceRoot, normalized)));
      }
    }

    let entries: string[] | undefined;

    for (const [entry, bundler] of this.#fileContexts.entries()) {
      if (bundler.invalidate(normalizedFiles)) {
        entries ??= [];
        entries.push(entry);
      }
    }
    for (const [entry, bundler] of this.#inlineContexts.entries()) {
      // Entry is format: [language, id, filename].join(';')
      const firstSemi = entry.indexOf(';');
      const secondSemi = firstSemi !== -1 ? entry.indexOf(';', firstSemi + 1) : -1;
      const filename = secondSemi !== -1 ? entry.slice(secondSemi + 1) : '';
      if (filename && normalizedFiles.has(path.normalize(filename))) {
        this.#inlineContexts.delete(entry);
        void bundler.dispose();
      } else {
        bundler.invalidate(normalizedFiles);
      }
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
    this.#loadCache.clear();

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

    // Clone metafile to prevent mutation of the cached result by downstream plugins
    const metafile = {
      inputs: { ...result.metafile.inputs },
      outputs: Object.fromEntries(
        Object.entries(result.metafile.outputs).map(([key, output]) => {
          const cloned = { ...output, ['ng-component']: true };
          delete cloned.entryPoint;

          return [key, cloned];
        }),
      ),
    };

    return {
      errors,
      warnings,
      contents,
      outputFiles,
      metafile,
      referencedFiles,
      externalImports: result.externalImports,
      platform: result.platform,
      initialFiles: new Map(),
    };
  }
}
