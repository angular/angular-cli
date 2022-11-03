/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuildOptions, OutputFile } from 'esbuild';
import * as path from 'path';
import { createCssResourcePlugin } from './css-resource-plugin';
import { bundle } from './esbuild';
import { createSassPlugin } from './sass-plugin';

export interface BundleStylesheetOptions {
  workspaceRoot: string;
  optimization: boolean;
  preserveSymlinks?: boolean;
  sourcemap: boolean | 'external' | 'inline';
  outputNames?: { bundles?: string; media?: string };
  includePaths?: string[];
  externalDependencies?: string[];
  target: string[];
}

async function bundleStylesheet(
  entry: Required<Pick<BuildOptions, 'stdin'> | Pick<BuildOptions, 'entryPoints'>>,
  options: BundleStylesheetOptions,
) {
  // Execute esbuild
  const result = await bundle({
    ...entry,
    absWorkingDir: options.workspaceRoot,
    bundle: true,
    entryNames: options.outputNames?.bundles,
    assetNames: options.outputNames?.media,
    logLevel: 'silent',
    minify: options.optimization,
    sourcemap: options.sourcemap,
    outdir: options.workspaceRoot,
    write: false,
    platform: 'browser',
    target: options.target,
    preserveSymlinks: options.preserveSymlinks,
    external: options.externalDependencies,
    conditions: ['style', 'sass'],
    mainFields: ['style', 'sass'],
    plugins: [
      createSassPlugin({ sourcemap: !!options.sourcemap, loadPaths: options.includePaths }),
      createCssResourcePlugin(),
    ],
  });

  // Extract the result of the bundling from the output files
  let contents = '';
  let map;
  let outputPath;
  const resourceFiles: OutputFile[] = [];
  if (result.outputFiles) {
    for (const outputFile of result.outputFiles) {
      outputFile.path = path.relative(options.workspaceRoot, outputFile.path);
      const filename = path.basename(outputFile.path);
      if (filename.endsWith('.css')) {
        outputPath = outputFile.path;
        contents = outputFile.text;
      } else if (filename.endsWith('.css.map')) {
        map = outputFile.text;
      } else {
        // The output files could also contain resources (images/fonts/etc.) that were referenced
        resourceFiles.push(outputFile);
      }
    }
  }

  return {
    errors: result.errors,
    warnings: result.warnings,
    contents,
    map,
    path: outputPath,
    resourceFiles,
  };
}

/**
 * Bundle a stylesheet that exists as a file on the filesystem.
 *
 * @param filename The path to the file to bundle.
 * @param options The stylesheet bundling options to use.
 * @returns The bundle result object.
 */
export async function bundleStylesheetFile(filename: string, options: BundleStylesheetOptions) {
  return bundleStylesheet({ entryPoints: [filename] }, options);
}

/**
 * Bundle stylesheet text data from a string.
 *
 * @param data The string content of a stylesheet to bundle.
 * @param dataOptions The options to use to resolve references and name output of the stylesheet data.
 * @param bundleOptions  The stylesheet bundling options to use.
 * @returns The bundle result object.
 */
export async function bundleStylesheetText(
  data: string,
  dataOptions: { resolvePath: string; virtualName?: string },
  bundleOptions: BundleStylesheetOptions,
) {
  const result = bundleStylesheet(
    {
      stdin: {
        contents: data,
        sourcefile: dataOptions.virtualName,
        resolveDir: dataOptions.resolvePath,
        loader: 'css',
      },
    },
    bundleOptions,
  );

  return result;
}
