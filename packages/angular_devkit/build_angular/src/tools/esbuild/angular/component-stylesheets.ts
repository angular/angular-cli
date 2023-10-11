/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { OutputFile } from 'esbuild';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { BuildOutputFileType, BundleContextResult, BundlerContext } from '../bundler-context';
import { LoadResultCache } from '../load-result-cache';
import {
  BundleStylesheetOptions,
  createStylesheetBundleOptions,
} from '../stylesheets/bundle-options';

class BundlerContextCache extends Map<string, BundlerContext> {
  getOrCreate(key: string, creator: () => BundlerContext): BundlerContext {
    let value = this.get(key);

    if (value === undefined) {
      value = creator();
      this.set(key, value);
    }

    return value;
  }
}

/**
 * Bundles component stylesheets. A stylesheet can be either an inline stylesheet that
 * is contained within the Component's metadata definition or an external file referenced
 * from the Component's metadata definition.
 */
export class ComponentStylesheetBundler {
  readonly #fileContexts = new BundlerContextCache();
  readonly #inlineContexts = new BundlerContextCache();

  /**
   *
   * @param options An object containing the stylesheet bundling options.
   * @param cache A load result cache to use when bundling.
   */
  constructor(
    private readonly options: BundleStylesheetOptions,
    private readonly cache?: LoadResultCache,
  ) {}

  async bundleFile(entry: string) {
    const bundlerContext = this.#fileContexts.getOrCreate(entry, () => {
      const buildOptions = createStylesheetBundleOptions(this.options, this.cache);
      buildOptions.entryPoints = [entry];

      return new BundlerContext(this.options.workspaceRoot, true, buildOptions);
    });

    return extractResult(await bundlerContext.bundle(), bundlerContext.watchFiles);
  }

  async bundleInline(data: string, filename: string, language: string) {
    // Use a hash of the inline stylesheet content to ensure a consistent identifier. External stylesheets will resolve
    // to the actual stylesheet file path.
    // TODO: Consider xxhash instead for hashing
    const id = createHash('sha256').update(data).digest('hex');
    const entry = [language, id, filename].join(';');

    const bundlerContext = this.#inlineContexts.getOrCreate(entry, () => {
      const namespace = 'angular:styles/component';
      const buildOptions = createStylesheetBundleOptions(this.options, this.cache, {
        [entry]: data,
      });
      buildOptions.entryPoints = [`${namespace};${entry}`];
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
          build.onLoad({ filter: /^css;/, namespace }, async () => {
            return {
              contents: data,
              loader: 'css',
              resolveDir: path.dirname(filename),
            };
          });
        },
      });

      return new BundlerContext(this.options.workspaceRoot, true, buildOptions);
    });

    // Extract the result of the bundling from the output files
    return extractResult(await bundlerContext.bundle(), bundlerContext.watchFiles);
  }

  async dispose(): Promise<void> {
    const contexts = [...this.#fileContexts.values(), ...this.#inlineContexts.values()];
    this.#fileContexts.clear();
    this.#inlineContexts.clear();

    await Promise.allSettled(contexts.map((context) => context.dispose()));
  }
}

function extractResult(result: BundleContextResult, referencedFiles?: Set<string>) {
  let contents = '';
  let map;
  let outputPath;
  const resourceFiles: OutputFile[] = [];
  if (!result.errors) {
    for (const outputFile of result.outputFiles) {
      const filename = path.basename(outputFile.path);
      if (outputFile.type === BuildOutputFileType.Media) {
        // The output files could also contain resources (images/fonts/etc.) that were referenced
        resourceFiles.push(outputFile);
      } else if (filename.endsWith('.css')) {
        outputPath = outputFile.path;
        contents = outputFile.text;
      } else if (filename.endsWith('.css.map')) {
        map = outputFile.text;
      } else {
        throw new Error(
          `Unexpected non CSS/Media file "${filename}" outputted during component stylesheet processing.`,
        );
      }
    }
  }

  let metafile;
  if (!result.errors) {
    metafile = result.metafile;
    // Remove entryPoint fields from outputs to prevent the internal component styles from being
    // treated as initial files. Also mark the entry as a component resource for stat reporting.
    Object.values(metafile.outputs).forEach((output) => {
      delete output.entryPoint;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (output as any)['ng-component'] = true;
    });
  }

  return {
    errors: result.errors,
    warnings: result.warnings,
    contents,
    map,
    path: outputPath,
    resourceFiles,
    metafile,
    referencedFiles,
  };
}
